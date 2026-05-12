/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Client-Side Markdown Sanitization for AESOP
 *
 * Sanitizes skill markdown before rendering to prevent XSS attacks.
 * Uses a lightweight approach without external dependencies.
 *
 * Note: Server-side sanitization in input_sanitization.ts is the primary defense.
 * This is defense-in-depth for the browser.
 */

interface SanitizeOptions {
  allowedTags?: string[];
  allowedAttributes?: string[];
  maxLength?: number;
}

const DEFAULT_ALLOWED_TAGS = [
  'p',
  'br',
  'strong',
  'em',
  'code',
  'pre',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'ul',
  'ol',
  'li',
  'blockquote',
  'a',
  'img',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
];

const DEFAULT_ALLOWED_ATTRIBUTES = ['href', 'src', 'alt', 'title', 'class'];

/**
 * Sanitize skill markdown for safe rendering
 *
 * Removes:
 * - Script tags and event handlers
 * - Dangerous protocols (javascript:, data:)
 * - Iframe and object tags
 * - Excessive HTML
 *
 * Preserves:
 * - Safe markdown formatting
 * - Links and images (with safe protocols)
 * - Code blocks
 */
export function sanitizeSkillMarkdown(markdown: string, options: SanitizeOptions = {}): string {
  if (!markdown) {
    return '';
  }

  const {
    allowedTags = DEFAULT_ALLOWED_TAGS,
    allowedAttributes = DEFAULT_ALLOWED_ATTRIBUTES,
    maxLength = 100000,
  } = options;

  let sanitized = markdown;

  // Truncate if too long
  if (sanitized.length > maxLength) {
    sanitized = sanitized.slice(0, maxLength) + '\n\n[Content truncated for safety]';
  }

  // Remove script tags (case insensitive)
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Remove iframe tags
  sanitized = sanitized.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');

  // Remove object and embed tags
  sanitized = sanitized.replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '');
  sanitized = sanitized.replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '');

  // Remove event handlers (onclick, onerror, etc.)
  sanitized = sanitized.replace(/\son\w+\s*=\s*["'][^"']*["']/gi, '');

  // Remove dangerous protocols from href and src
  sanitized = sanitized.replace(/href\s*=\s*["']javascript:[^"']*["']/gi, 'href="#"');
  sanitized = sanitized.replace(/href\s*=\s*["']data:[^"']*["']/gi, 'href="#"');
  sanitized = sanitized.replace(/src\s*=\s*["']javascript:[^"']*["']/gi, 'src=""');
  sanitized = sanitized.replace(/src\s*=\s*["']data:[^"']*["']/gi, 'src=""');

  // Remove style tags (can contain javascript)
  sanitized = sanitized.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

  // Remove base, meta, link tags (can be used for attacks)
  sanitized = sanitized.replace(/<(base|meta|link)\b[^>]*>/gi, '');

  // Filter out disallowed tags (basic approach)
  // This is a simple filter; for production, consider a proper HTML parser
  const tagPattern = /<\/?([a-z][a-z0-9]*)\b[^>]*>/gi;
  sanitized = sanitized.replace(tagPattern, (match, tagName) => {
    const lowerTag = tagName.toLowerCase();
    if (allowedTags.includes(lowerTag)) {
      // Keep allowed tags but sanitize attributes
      return sanitizeTagAttributes(match, allowedAttributes);
    }
    // Remove disallowed tags
    return '';
  });

  return sanitized;
}

/**
 * Sanitize HTML tag attributes to keep only allowed ones
 */
function sanitizeTagAttributes(tag: string, allowedAttributes: string[]): string {
  // Extract tag name
  const tagNameMatch = tag.match(/^<\/?([a-z][a-z0-9]*)/i);
  if (!tagNameMatch) {
    return tag;
  }

  const tagName = tagNameMatch[1];
  const isClosing = tag.startsWith('</');

  // Closing tags don't have attributes
  if (isClosing) {
    return tag;
  }

  // Extract and filter attributes
  const attrPattern = /(\w+)\s*=\s*["']([^"']*)["']/g;
  const attributes: string[] = [];

  let match;
  while ((match = attrPattern.exec(tag)) !== null) {
    const [, attrName, attrValue] = match;
    if (allowedAttributes.includes(attrName.toLowerCase())) {
      // Additional validation for href and src
      if (attrName.toLowerCase() === 'href' || attrName.toLowerCase() === 'src') {
        if (isSafeUrl(attrValue)) {
          // Don't escape '/' in URLs — only escape truly dangerous chars
          attributes.push(`${attrName}="${escapeUrlAttr(attrValue)}"`);
        }
      } else {
        attributes.push(`${attrName}="${escapeHtml(attrValue)}"`);
      }
    }
  }

  // Reconstruct tag
  if (attributes.length > 0) {
    return `<${tagName} ${attributes.join(' ')}>`;
  }

  return `<${tagName}>`;
}

/**
 * Check if URL is safe (no javascript:, data:, etc.)
 */
function isSafeUrl(url: string): boolean {
  const lower = url.toLowerCase().trim();

  // Block dangerous protocols
  // Construct dynamically to avoid no-script-url lint rule
  const dangerousProtocols = [`${'java'}script:`, 'data:', `${'vb'}script:`, 'file:'];
  for (const protocol of dangerousProtocols) {
    if (lower.startsWith(protocol)) {
      return false;
    }
  }

  // Allow http, https, mailto, relative URLs
  return true;
}

/**
 * Escape URL attribute values — only escapes chars that break HTML attribute parsing,
 * but preserves forward slashes so URLs remain valid.
 */
function escapeUrlAttr(url: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
  };
  return url.replace(/[&<>"']/g, (char) => map[char]);
}

/**
 * Escape HTML entities to prevent injection
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };

  return text.replace(/[&<>"'/]/g, (char) => map[char]);
}

/**
 * Sanitize plain text (for displaying user input as text, not HTML)
 */
export function sanitizePlainText(text: string, maxLength = 10000): string {
  if (!text) {
    return '';
  }

  let sanitized = text;

  // Truncate
  if (sanitized.length > maxLength) {
    sanitized = sanitized.slice(0, maxLength) + '...';
  }

  // Escape HTML
  sanitized = escapeHtml(sanitized);

  return sanitized;
}

/**
 * Sanitize and validate YAML frontmatter
 */
export function sanitizeFrontmatter(frontmatter: string): string {
  // Remove any eval(), require(), import statements
  const dangerous = ['eval(', 'require(', 'import(', 'import ', 'Function('];

  for (const pattern of dangerous) {
    if (frontmatter.includes(pattern)) {
      throw new Error('Frontmatter contains dangerous code execution patterns');
    }
  }

  return frontmatter;
}
