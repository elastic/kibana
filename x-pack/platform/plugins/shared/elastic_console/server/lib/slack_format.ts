/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// ---------------------------------------------------------------------------
// Markdown → Slack mrkdwn converter
//
// Slack's mrkdwn differs from standard Markdown in bold, headers, links,
// and has no table support. This module converts AI response Markdown
// into Slack-renderable text.
// ---------------------------------------------------------------------------

function stripInlineMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/~~(.+?)~~/g, '$1');
}

function isSeparatorRow(line: string): boolean {
  return /^\s*\|[\s\-:|]+\|\s*$/.test(line);
}

function formatTable(lines: string[]): string {
  const rows = lines
    .filter((line) => !isSeparatorRow(line))
    .map((line) =>
      line
        .replace(/^\s*\|/, '')
        .replace(/\|\s*$/, '')
        .split('|')
        .map((cell) => stripInlineMarkdown(cell.trim()))
    );

  if (rows.length === 0) return lines.join('\n');

  const numCols = Math.max(...rows.map((r) => r.length));
  const colWidths = Array.from({ length: numCols }, (_, col) =>
    Math.max(...rows.map((row) => (row[col] ?? '').length))
  );

  const formatted = rows
    .map((row) => row.map((cell, col) => cell.padEnd(colWidths[col] ?? 0)).join('  '))
    .join('\n');

  return '```\n' + formatted + '\n```';
}

function convertTables(text: string): string {
  const lines = text.split('\n');
  const result: string[] = [];
  let i = 0;

  while (i < lines.length) {
    if (/^\s*\|/.test(lines[i])) {
      const tableLines: string[] = [];
      while (i < lines.length && /^\s*\|/.test(lines[i])) {
        tableLines.push(lines[i]);
        i++;
      }
      result.push(formatTable(tableLines));
    } else {
      result.push(lines[i]);
      i++;
    }
  }

  return result.join('\n');
}

export const markdownToMrkdwn = (md: string): string => {
  // 1. Tables → monospace code blocks (before code block extraction)
  let text = convertTables(md);

  // 2. Protect fenced code blocks — strip language tag, store for later
  const codeBlocks: string[] = [];
  text = text.replace(/```\w*\n([\s\S]*?)```/g, (_, code) => {
    codeBlocks.push('```\n' + code.trimEnd() + '\n```');
    return `\x00CB${codeBlocks.length - 1}\x00`;
  });

  // 3. Protect inline code
  const inlineCode: string[] = [];
  text = text.replace(/`([^`\n]+)`/g, (match) => {
    inlineCode.push(match);
    return `\x00IC${inlineCode.length - 1}\x00`;
  });

  // 4. Headers → bold
  text = text.replace(/^#{1,6}\s+(.+)$/gm, '*$1*');

  // 5. Images → Slack format (before links to avoid collision)
  text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<$2|$1>');

  // 6. Links → Slack format
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<$2|$1>');

  // 7. Bold **text** and __text__ → *text*
  text = text.replace(/\*\*(.+?)\*\*/g, '*$1*');
  text = text.replace(/__(.+?)__/g, '*$1*');

  // 8. Strikethrough ~~text~~ → ~text~
  text = text.replace(/~~(.+?)~~/g, '~$1~');

  // 9. Horizontal rules → blank line
  text = text.replace(/^[\s]*[-*_]{3,}[\s]*$/gm, '');

  // 10. Restore inline code
  text = text.replace(/\x00IC(\d+)\x00/g, (_, i) => inlineCode[parseInt(i, 10)]);

  // 11. Restore code blocks
  text = text.replace(/\x00CB(\d+)\x00/g, (_, i) => codeBlocks[parseInt(i, 10)]);

  // 12. Collapse excessive blank lines
  text = text.replace(/\n{3,}/g, '\n\n');

  return text.trim();
};
