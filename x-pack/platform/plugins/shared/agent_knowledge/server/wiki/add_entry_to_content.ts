/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const FENCE = /^\s*(```|~~~)/;

/**
 * Index of each line that opens a level-two section. Lines inside fenced code blocks are skipped,
 * so a `## ` quoted in a code sample does not split the page.
 */
const findSectionStarts = (lines: string[]): number[] => {
  const starts: number[] = [];
  let inFence = false;
  lines.forEach((line, index) => {
    if (FENCE.test(line)) {
      inFence = !inFence;
      return;
    }
    if (!inFence && /^## /.test(line)) {
      starts.push(index);
    }
  });
  return starts;
};

const trimBlankEdges = (lines: string[]): string[] => {
  let start = 0;
  let end = lines.length;
  while (start < end && lines[start].trim() === '') start++;
  while (end > start && lines[end - 1].trim() === '') end--;
  return lines.slice(start, end);
};

/**
 * Adds an entry at the end of the `## <heading>` section, creating the section at the end of the
 * page when it is missing. Every line already on the page is kept as it was; only blank lines at
 * the edges of the entries section are normalised to one.
 */
export const addEntryToContent = (content: string, heading: string, entry: string): string => {
  const entryLines = trimBlankEdges(entry.split('\n'));
  const lines = content === '' ? [] : content.split('\n');
  const starts = findSectionStarts(lines);
  const sectionStart = starts.find((index) => lines[index].trim() === `## ${heading}`);

  if (sectionStart === undefined) {
    const before = trimBlankEdges(lines);
    const section = [`## ${heading}`, '', ...entryLines];
    return [...before, ...(before.length > 0 ? [''] : []), ...section, ''].join('\n');
  }

  const sectionEnd = starts.find((index) => index > sectionStart) ?? lines.length;
  const section = trimBlankEdges(lines.slice(sectionStart, sectionEnd));
  const after = lines.slice(sectionEnd);
  return [...lines.slice(0, sectionStart), ...section, '', ...entryLines, '', ...after].join('\n');
};
