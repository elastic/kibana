/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiCallOut,
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useMutation, useQueryClient } from '@kbn/react-query';
import React from 'react';
import { DISCOVERY_QUERIES_QUERY_KEY } from '../../../../hooks/sig_events/use_fetch_discovery_queries';
import { UNBACKED_QUERIES_COUNT_QUERY_KEY } from '../../../../hooks/sig_events/use_unbacked_queries_count';
import { useOnboardingApi } from '../../../../hooks/use_onboarding_api';
import { useQueriesApi } from '../../../../hooks/sig_events/use_queries_api';
import { usePromotableQueries } from '../../../../hooks/sig_events/use_promotable_queries';
import { getFormattedError } from '../../../../util/errors';
import { useKibana } from '../../../../hooks/use_kibana';
import { AssetImage } from '../../../asset_image';

interface PromotionCalloutProps {
  streamName: string;
  onReviewClick: () => void;
}

export function PromotionCallout({ streamName, onReviewClick }: PromotionCalloutProps) {
  const { euiTheme } = useEuiTheme();
  const {
    core: {
      notifications: { toasts },
    },
  } = useKibana();
  const queryClient = useQueryClient();

  const { queries, isLoading, refetch } = usePromotableQueries(streamName);
  const { acknowledgeOnboardingTask } = useOnboardingApi();
  const { promote } = useQueriesApi();

  const promoteMutation = useMutation<{ promoted: number }, Error>({
    mutationFn: () => {
      return promote({ queryIds: queries.map(({ query }) => query.id) });
    },
    onSuccess: async ({ promoted }) => {
      toasts.addSuccess(PROMOTION_SUCCESS_TOAST(promoted));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: DISCOVERY_QUERIES_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: UNBACKED_QUERIES_COUNT_QUERY_KEY }),
      ]);
      refetch();
    },
    onError: (error) => {
      toasts.addError(getFormattedError(error), {
        title: PROMOTION_ERROR_TOAST_TITLE,
      });
    },
  });

  const acknowledgeTaskMutation = useMutation<void, Error>({
    mutationFn: async () => {
      await acknowledgeOnboardingTask(streamName);
    },
    onSuccess: async () => {
      await refetch();
    },
    onError: (error) => {
      toasts.addError(getFormattedError(error), {
        title: ACKNOWLEDGE_ERROR_TOAST_TITLE,
      });
    },
  });

  if (isLoading || acknowledgeTaskMutation.isLoading || queries.length === 0) {
    return null;
  }

  return (
    <EuiCallOut
      color="primary"
      size="s"
      onDismiss={() => acknowledgeTaskMutation.mutate()}
      data-test-subj="streamsAppPromotionCallout"
    >
      <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false} wrap>
        <EuiFlexItem grow={false}>
          <AssetImage type="significantEventsEmptyState" size={62} />
        </EuiFlexItem>

        <EuiFlexItem grow>
          <EuiText
            size="s"
            css={css`
              color: ${euiTheme.colors.primaryText};
            `}
          >
            <p>
              <FormattedMessage
                id="xpack.streams.significantEvents.promotionCallout.message"
                defaultMessage="Based on severity, we detected {queryCount} that you can promote in {ruleCount}, based on the last run."
                values={{
                  queryCount: <strong>{QUERY_COUNT_LABEL(queries.length)}</strong>,
                  ruleCount: RULE_COUNT_LABEL(queries.length),
                }}
              />
            </p>
          </EuiText>
        </EuiFlexItem>

        <EuiFlexItem
          grow={false}
          css={css`
            padding-right: ${euiTheme.size.s};
          `}
        >
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                color="primary"
                size="s"
                onClick={() => promoteMutation.mutate()}
                isLoading={promoteMutation.isLoading}
                data-test-subj="streamsAppPromotionCalloutPromoteButton"
              >
                {PROMOTE_BUTTON_LABEL}
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                color="text"
                size="s"
                onClick={onReviewClick}
                data-test-subj="streamsAppPromotionCalloutReviewButton"
              >
                {REVIEW_BUTTON_LABEL}
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiCallOut>
  );
}

const PROMOTION_SUCCESS_TOAST = (count: number) =>
  i18n.translate('xpack.streams.significantEvents.promotionCallout.successToast', {
    defaultMessage:
      '{count, plural, one {# query} other {# queries}} promoted to {count, plural, one {rule} other {rules}} successfully.',
    values: { count },
  });

const PROMOTION_ERROR_TOAST_TITLE = i18n.translate(
  'xpack.streams.significantEvents.promotionCallout.errorToast',
  {
    defaultMessage: 'Failed to promote queries',
  }
);

const ACKNOWLEDGE_ERROR_TOAST_TITLE = i18n.translate(
  'xpack.streams.significantEvents.promotionCallout.acknowledgeError',
  {
    defaultMessage: 'Failed to acknowledge generation results',
  }
);

const QUERY_COUNT_LABEL = (count: number) =>
  i18n.translate('xpack.streams.significantEvents.promotionCallout.queryCount', {
    defaultMessage: '{count, plural, one {# query} other {# queries}}',
    values: { count },
  });

const RULE_COUNT_LABEL = (count: number) =>
  i18n.translate('xpack.streams.significantEvents.promotionCallout.ruleCount', {
    defaultMessage: '{count, plural, one {# rule} other {# rules}}',
    values: { count },
  });

const PROMOTE_BUTTON_LABEL = i18n.translate(
  'xpack.streams.significantEvents.promotionCallout.promoteButton',
  {
    defaultMessage: 'Create rules',
  }
);

const REVIEW_BUTTON_LABEL = i18n.translate(
  'xpack.streams.significantEvents.promotionCallout.reviewButton',
  {
    defaultMessage: 'Review results',
  }
);
