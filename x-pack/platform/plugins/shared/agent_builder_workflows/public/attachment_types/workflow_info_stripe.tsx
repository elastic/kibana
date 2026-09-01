/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseEuiTheme } from '@elastic/eui';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiIconTip, EuiSpacer, EuiText } from '@elastic/eui';
import { css } from '@emotion/react';
import { parse } from 'yaml';
import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import type { Step, WorkflowYaml } from '@kbn/workflows';
import { collectAllSteps } from '@kbn/workflows';
import { getBaseConnectorType, getStepIconType, getTriggerTypeIconType } from '@kbn/workflows-ui';

const MAX_VISIBLE_TAGS = 3;

interface WorkflowMeta {
  triggerTypes: string[];
  stepBaseTypes: string[];
  tags: string[];
  stepCount: number;
}

const extractMeta = (yaml: string): WorkflowMeta => {
  const empty: WorkflowMeta = { triggerTypes: [], stepBaseTypes: [], tags: [], stepCount: 0 };
  // Streaming/partial YAML can produce malformed nested structures that make
  // `collectAllSteps` throw, so guard the whole extraction.
  try {
    const parsed = parse(yaml) as Partial<WorkflowYaml> | undefined;
    if (!parsed || typeof parsed !== 'object') return empty;

    const triggerTypes = Array.isArray(parsed.triggers)
      ? parsed.triggers
          .map((t) => (t && typeof t === 'object' ? (t as { type?: string }).type : undefined))
          .filter((t): t is string => typeof t === 'string' && t.length > 0)
      : [];

    const stepBaseTypes: string[] = [];
    const seenSteps = new Set<string>();
    let stepCount = 0;
    if (Array.isArray(parsed.steps)) {
      const allSteps = collectAllSteps(parsed.steps as WorkflowYaml['steps']) as Step[];
      stepCount = allSteps.length;
      for (const step of allSteps) {
        if (!step?.type) continue;
        const base = getBaseConnectorType(step.type);
        if (!seenSteps.has(base)) {
          seenSteps.add(base);
          stepBaseTypes.push(base);
        }
      }
    }

    const tags = Array.isArray(parsed.tags)
      ? parsed.tags.filter((t): t is string => typeof t === 'string' && t.length > 0)
      : [];

    return { triggerTypes, stepBaseTypes, tags, stepCount };
  } catch {
    return empty;
  }
};

interface WorkflowInfoStripeProps {
  yaml: string;
  showTitle?: boolean;
}

export const WorkflowInfoStripe: React.FC<WorkflowInfoStripeProps> = ({ yaml, showTitle }) => {
  const styles = useMemoCss(componentStyles);
  const { triggerTypes, stepBaseTypes, tags, stepCount } = useMemo(() => extractMeta(yaml), [yaml]);

  const hasAny = triggerTypes.length > 0 || stepBaseTypes.length > 0 || tags.length > 0;
  if (!hasAny) return null;

  const visibleTags = tags.slice(0, MAX_VISIBLE_TAGS);
  const overflowTagCount = tags.length - visibleTags.length;
  const hasDivider = triggerTypes.length > 0 && stepBaseTypes.length > 0;

  const iconsRow = (
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap css={styles.container}>
      {triggerTypes.map((type, idx) => (
        <EuiFlexItem grow={false} key={`trigger-${idx}-${type}`}>
          <EuiIconTip
            type={getTriggerTypeIconType(`trigger_${type}`)}
            size="m"
            content={triggerLabel(type)}
            aria-label={triggerLabel(type)}
          />
        </EuiFlexItem>
      ))}
      {hasDivider && <EuiFlexItem grow={false} css={styles.divider} />}
      {stepBaseTypes.map((type) => (
        <EuiFlexItem grow={false} key={`step-${type}`}>
          <EuiIconTip type={getStepIconType(type)} size="m" content={type} aria-label={type} />
        </EuiFlexItem>
      ))}
      {visibleTags.length > 0 && <EuiFlexItem grow={false} css={styles.tagSpacer} />}
      {visibleTags.map((tag) => (
        <EuiFlexItem grow={false} key={`tag-${tag}`}>
          <EuiBadge color="hollow" title={tag}>
            {tag}
          </EuiBadge>
        </EuiFlexItem>
      ))}
      {overflowTagCount > 0 && (
        <EuiFlexItem grow={false}>
          <EuiBadge color="hollow">{`+${overflowTagCount}`}</EuiBadge>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );

  if (!showTitle) return iconsRow;

  const triggerCount = triggerTypes.length;
  return (
    <>
      <EuiText size="xs">
        <strong>
          {i18n.translate('workflowsManagement.attachmentRenderers.stripe.title', {
            defaultMessage:
              '{triggerCount, plural, one {# trigger} other {# triggers}} and {stepCount, plural, one {# step} other {# steps}}',
            values: { triggerCount, stepCount },
          })}
        </strong>
      </EuiText>
      <EuiSpacer size="s" />
      {iconsRow}
    </>
  );
};

const triggerLabel = (type: string): string => {
  switch (type) {
    case 'manual':
      return i18n.translate('workflowsManagement.attachmentRenderers.stripe.triggerManual', {
        defaultMessage: 'Manual trigger',
      });
    case 'scheduled':
      return i18n.translate('workflowsManagement.attachmentRenderers.stripe.triggerScheduled', {
        defaultMessage: 'Scheduled trigger',
      });
    case 'alert':
      return i18n.translate('workflowsManagement.attachmentRenderers.stripe.triggerAlert', {
        defaultMessage: 'Alert trigger',
      });
    default:
      return type;
  }
};

const componentStyles = {
  container: ({ euiTheme }: UseEuiTheme) =>
    css({
      padding: `${euiTheme.size.xs} 0`,
      minWidth: 0,
    }),
  divider: ({ euiTheme }: UseEuiTheme) =>
    css({
      alignSelf: 'center',
      width: 1,
      height: euiTheme.size.base,
      backgroundColor: euiTheme.colors.borderBaseSubdued,
    }),
  tagSpacer: ({ euiTheme }: UseEuiTheme) =>
    css({
      width: euiTheme.size.xs,
    }),
};
