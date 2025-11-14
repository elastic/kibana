/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { monaco } from '@kbn/monaco';
import { ACTION_METADATA_MAP, type ActionMetadata } from '@kbn/streamlang';
import type { ActionHoverContext } from './provider_interfaces';

export class StreamlangActionHandler {
  private readonly metadataMap: Record<string, ActionMetadata>;

  constructor(metadataMap: Record<string, ActionMetadata> = ACTION_METADATA_MAP) {
    this.metadataMap = metadataMap;
  }

  canHandle(actionType: string): boolean {
    return actionType in this.metadataMap;
  }

  async generateHoverContent(context: ActionHoverContext): Promise<monaco.IMarkdownString | null> {
    const metadata = this.metadataMap[context.actionType];
    if (!metadata) {
      return null;
    }

    const content = this.buildHoverMarkdown(metadata, context.actionType);
    return this.createMarkdownContent(content);
  }

  private buildHoverMarkdown(metadata: ActionMetadata, actionType: string): string {
    const sections: string[] = [];

    // Header
    sections.push(`**Streamlang Action**: \`${actionType}\``);
    sections.push('');

    // Description
    sections.push(metadata.description);
    sections.push('');

    // Usage guidance
    sections.push(`**Usage**: ${metadata.usage}`);
    sections.push('');

    // Examples
    if (metadata.examples.length > 0) {
      sections.push('### Examples:');
      metadata.examples.forEach((example, index) => {
        if (example.description) {
          sections.push(`**${example.description}**`);
        }
        sections.push('```yaml');
        sections.push(example.yaml);
        sections.push('```');
        if (index < metadata.examples.length - 1) {
          sections.push('');
        }
      });
      sections.push('');
    }

    // Tips
    if (metadata.tips && metadata.tips.length > 0) {
      sections.push('### 💡 Tips:');
      metadata.tips.forEach((tip) => {
        sections.push(`- ${tip}`);
      });
    }

    return sections.join('\n');
  }

  private createMarkdownContent(content: string): monaco.IMarkdownString {
    return {
      value: content,
      isTrusted: true,
      supportHtml: true,
    };
  }
}
