/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { monaco } from '@kbn/monaco';
import { ACTION_METADATA_MAP, type ActionMetadata } from '@kbn/streamlang';
import { i18n } from '@kbn/i18n';
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
    sections.push(
      i18n.translate('xpack.streamlang.yamlEditor.hover.header', {
        defaultMessage: '**Streamlang Action**: `{action}`',
        values: { action: actionType },
      })
    );
    sections.push('');

    // Description
    sections.push(metadata.description);
    sections.push('');

    // Usage guidance
    sections.push(
      i18n.translate('xpack.streamlang.yamlEditor.hover.usage', {
        defaultMessage: '**Usage**: {usage}',
        values: { usage: metadata.usage },
      })
    );
    sections.push('');

    // Examples
    if (metadata.examples.length > 0) {
      sections.push(
        i18n.translate('xpack.streamlang.yamlEditor.hover.examplesHeading', {
          defaultMessage: '### Examples:',
        })
      );
      metadata.examples.forEach((example, index) => {
        if (example.description) {
          sections.push(
            i18n.translate('xpack.streamlang.yamlEditor.hover.exampleDescription', {
              defaultMessage: '**{description}**',
              values: { description: example.description },
            })
          );
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
      sections.push(
        i18n.translate('xpack.streamlang.yamlEditor.hover.tipsHeading', {
          defaultMessage: '### 💡 Tips:',
        })
      );
      metadata.tips.forEach((tip) => {
        sections.push(
          i18n.translate('xpack.streamlang.yamlEditor.hover.tipEntry', {
            defaultMessage: '- {tip}',
            values: { tip },
          })
        );
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
