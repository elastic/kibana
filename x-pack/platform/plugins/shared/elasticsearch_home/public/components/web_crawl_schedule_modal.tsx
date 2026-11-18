/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiConfirmModal,
  EuiFieldNumber,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSelect,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { WebCrawl, WebCrawlScheduleRequest, WebCrawlScheduleUnit } from '../../common/types';

const MAX_INTERVAL = 365;

const UNIT_OPTIONS: Array<{ value: WebCrawlScheduleUnit; text: string }> = [
  {
    value: 'h',
    text: i18n.translate('xpack.elasticsearchHome.webCrawls.schedule.hours', {
      defaultMessage: 'hours',
    }),
  },
  {
    value: 'd',
    text: i18n.translate('xpack.elasticsearchHome.webCrawls.schedule.days', {
      defaultMessage: 'days',
    }),
  },
];

const EVERY_LABEL = i18n.translate('xpack.elasticsearchHome.webCrawls.schedule.everyLabel', {
  defaultMessage: 'Crawl every',
});

interface WebCrawlScheduleModalProps {
  /** The crawl whose URL and limits the schedule repeats. */
  crawl: WebCrawl;
  isCreating: boolean;
  errorMessage?: string;
  onConfirm: (request: WebCrawlScheduleRequest) => void;
  onCancel: () => void;
}

export const WebCrawlScheduleModal = ({
  crawl,
  isCreating,
  errorMessage,
  onConfirm,
  onCancel,
}: WebCrawlScheduleModalProps) => {
  const titleId = useGeneratedHtmlId();
  const [every, setEvery] = useState(1);
  const [unit, setUnit] = useState<WebCrawlScheduleUnit>('d');
  const isEveryInvalid = !Number.isInteger(every) || every < 1 || every > MAX_INTERVAL;

  return (
    <EuiConfirmModal
      aria-labelledby={titleId}
      titleProps={{ id: titleId }}
      title={i18n.translate('xpack.elasticsearchHome.webCrawls.schedule.title', {
        defaultMessage: 'Schedule a recurring crawl',
      })}
      onCancel={onCancel}
      onConfirm={() =>
        onConfirm({
          url: crawl.url,
          maxDepth: crawl.maxDepth,
          maxDocuments: crawl.maxDocuments,
          every,
          unit,
        })
      }
      cancelButtonText={i18n.translate('xpack.elasticsearchHome.webCrawls.schedule.cancel', {
        defaultMessage: 'Cancel',
      })}
      confirmButtonText={i18n.translate('xpack.elasticsearchHome.webCrawls.schedule.confirm', {
        defaultMessage: 'Create workflow',
      })}
      confirmButtonDisabled={isEveryInvalid}
      isLoading={isCreating}
      data-test-subj="elasticsearchHomeWebCrawlScheduleModal"
    >
      <EuiText size="s">
        <p>
          {i18n.translate('xpack.elasticsearchHome.webCrawls.schedule.description', {
            defaultMessage:
              'Creates a workflow that crawls {url} again on this interval, with the same depth and page limits. Change or pause it in Workflows.',
            values: { url: crawl.url },
          })}
        </p>
      </EuiText>
      <EuiFormRow
        label={EVERY_LABEL}
        isInvalid={isEveryInvalid || errorMessage !== undefined}
        error={
          isEveryInvalid
            ? i18n.translate('xpack.elasticsearchHome.webCrawls.schedule.invalidEvery', {
                defaultMessage: 'Enter a whole number from 1 to {max}.',
                values: { max: MAX_INTERVAL },
              })
            : errorMessage
        }
      >
        <EuiFlexGroup gutterSize="s" responsive={false}>
          <EuiFlexItem>
            <EuiFieldNumber
              min={1}
              max={MAX_INTERVAL}
              step={1}
              value={Number.isNaN(every) ? '' : every}
              aria-label={EVERY_LABEL}
              onChange={(event) => setEvery(event.target.valueAsNumber)}
              isInvalid={isEveryInvalid}
              data-test-subj="elasticsearchHomeWebCrawlScheduleEvery"
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiSelect
              options={UNIT_OPTIONS}
              value={unit}
              onChange={(event) => setUnit(event.target.value as WebCrawlScheduleUnit)}
              aria-label={i18n.translate('xpack.elasticsearchHome.webCrawls.schedule.unitLabel', {
                defaultMessage: 'Interval unit',
              })}
              data-test-subj="elasticsearchHomeWebCrawlScheduleUnit"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFormRow>
    </EuiConfirmModal>
  );
};
