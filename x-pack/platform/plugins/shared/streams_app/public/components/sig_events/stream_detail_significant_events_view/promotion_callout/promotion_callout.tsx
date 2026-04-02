/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
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

  const { count, queryIds, refetch } = usePromotableQueries(streamName);
  const { promote } = useQueriesApi();

  const promoteMutation = useMutation<{ promoted: number }, Error>({
    mutationFn: () => promote({ queryIds }),
    onSuccess: async ({ promoted }) => {
      toasts.addSuccess(
        i18n.translate('xpack.streams.significantEvents.promotionCallout.successToast', {
          defaultMessage:
            '{count, plural, one {# query} other {# queries}} promoted to {count, plural, one {rule} other {rules}} successfully.',
          values: { count: promoted },
        })
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: DISCOVERY_QUERIES_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: UNBACKED_QUERIES_COUNT_QUERY_KEY }),
      ]);
      refetch();
    },
    onError: (error) => {
      toasts.addError(getFormattedError(error), {
        title: i18n.translate('xpack.streams.significantEvents.promotionCallout.errorToast', {
          defaultMessage: 'Failed to promote queries',
        }),
      });
    },
  });

  if (count === 0) {
    return null;
  }

  return (
    <EuiPanel
      color="primary"
      paddingSize="s"
      hasShadow={false}
      hasBorder={false}
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
                defaultMessage="We detected {queryCount} that you can promote in {ruleCount}, based on the last run."
                values={{
                  queryCount: (
                    <strong>
                      {i18n.translate(
                        'xpack.streams.significantEvents.promotionCallout.queryCount',
                        {
                          defaultMessage: '{count, plural, one {# query} other {# queries}}',
                          values: { count },
                        }
                      )}
                    </strong>
                  ),
                  ruleCount: i18n.translate(
                    'xpack.streams.significantEvents.promotionCallout.ruleCount',
                    {
                      defaultMessage: '{count, plural, one {# rule} other {# rules}}',
                      values: { count },
                    }
                  ),
                }}
              />
            </p>
          </EuiText>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
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
                {i18n.translate('xpack.streams.significantEvents.promotionCallout.promoteButton', {
                  defaultMessage: 'Create rules',
                })}
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                color="text"
                size="s"
                onClick={onReviewClick}
                data-test-subj="streamsAppPromotionCalloutReviewButton"
              >
                {i18n.translate('xpack.streams.significantEvents.promotionCallout.reviewButton', {
                  defaultMessage: 'Review results',
                })}
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
