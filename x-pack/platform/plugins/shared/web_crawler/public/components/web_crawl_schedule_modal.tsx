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
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSelect,
  EuiSpacer,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  WEB_CRAWL_DEFAULT_MAX_DEPTH,
  WEB_CRAWL_DEFAULT_MAX_DOCUMENTS,
  WEB_CRAWL_MAX_DEPTH_LIMIT,
  WEB_CRAWL_MAX_DOCUMENTS_LIMIT,
} from '../../common/constants';
import type { WebCrawl, WebCrawlScheduleRequest, WebCrawlScheduleUnit } from '../../common/types';
import { isCrawlableUrl, isIntegerInRange } from '../validation';

const MAX_INTERVAL = 365;

const UNIT_OPTIONS: Array<{ value: WebCrawlScheduleUnit; text: string }> = [
  {
    value: 'h',
    text: i18n.translate('xpack.webCrawler.crawls.schedule.hours', {
      defaultMessage: 'hours',
    }),
  },
  {
    value: 'd',
    text: i18n.translate('xpack.webCrawler.crawls.schedule.days', {
      defaultMessage: 'days',
    }),
  },
];

const EVERY_LABEL = i18n.translate('xpack.webCrawler.crawls.schedule.everyLabel', {
  defaultMessage: 'Crawl every',
});

const URL_LABEL = i18n.translate('xpack.webCrawler.crawls.schedule.urlLabel', {
  defaultMessage: 'Website',
});

const MAX_DEPTH_LABEL = i18n.translate('xpack.webCrawler.crawls.schedule.maxDepthLabel', {
  defaultMessage: 'Max depth',
});

const MAX_DOCUMENTS_LABEL = i18n.translate('xpack.webCrawler.crawls.schedule.maxDocumentsLabel', {
  defaultMessage: 'Max pages',
});

interface WebCrawlScheduleModalProps {
  /** The crawl whose URL and limits the schedule repeats. Omit it to ask for them. */
  crawl?: WebCrawl;
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
  const [url, setUrl] = useState(crawl?.url ?? '');
  const [maxDepth, setMaxDepth] = useState(crawl?.maxDepth ?? WEB_CRAWL_DEFAULT_MAX_DEPTH);
  const [maxDocuments, setMaxDocuments] = useState(
    crawl?.maxDocuments ?? WEB_CRAWL_DEFAULT_MAX_DOCUMENTS
  );
  const [isUrlTouched, setIsUrlTouched] = useState(false);
  const trimmedUrl = url.trim();
  const isUrlInvalid = !isCrawlableUrl(trimmedUrl);
  const isMaxDepthInvalid = !isIntegerInRange(maxDepth, 0, WEB_CRAWL_MAX_DEPTH_LIMIT);
  const isMaxDocumentsInvalid = !isIntegerInRange(maxDocuments, 1, WEB_CRAWL_MAX_DOCUMENTS_LIMIT);
  const isEveryInvalid = !isIntegerInRange(every, 1, MAX_INTERVAL);

  return (
    <EuiConfirmModal
      aria-labelledby={titleId}
      titleProps={{ id: titleId }}
      title={i18n.translate('xpack.webCrawler.crawls.schedule.title', {
        defaultMessage: 'Schedule a recurring crawl',
      })}
      onCancel={onCancel}
      onConfirm={() => onConfirm({ url: trimmedUrl, maxDepth, maxDocuments, every, unit })}
      cancelButtonText={i18n.translate('xpack.webCrawler.crawls.schedule.cancel', {
        defaultMessage: 'Cancel',
      })}
      confirmButtonText={i18n.translate('xpack.webCrawler.crawls.schedule.confirm', {
        defaultMessage: 'Create workflow',
      })}
      confirmButtonDisabled={
        isEveryInvalid || isUrlInvalid || isMaxDepthInvalid || isMaxDocumentsInvalid
      }
      isLoading={isCreating}
      data-test-subj="webCrawlScheduleModal"
    >
      <EuiText size="s">
        <p>
          {crawl
            ? i18n.translate('xpack.webCrawler.crawls.schedule.description', {
                defaultMessage:
                  'Creates a workflow that crawls {url} again on this interval, with the same depth and page limits. Change or pause it in Workflows.',
                values: { url: crawl.url },
              })
            : i18n.translate('xpack.webCrawler.crawls.schedule.newDescription', {
                defaultMessage:
                  'Creates a workflow that crawls a website on this interval. Change or pause it in Workflows.',
              })}
        </p>
      </EuiText>
      {!crawl && (
        <>
          <EuiSpacer size="m" />
          <EuiFormRow
            fullWidth
            label={URL_LABEL}
            isInvalid={isUrlTouched && isUrlInvalid}
            error={i18n.translate('xpack.webCrawler.crawls.schedule.invalidUrl', {
              defaultMessage: 'Enter a URL that starts with http:// or https://',
            })}
          >
            <EuiFieldText
              fullWidth
              icon="globe"
              placeholder="https://example.com"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              onBlur={() => setIsUrlTouched(true)}
              isInvalid={isUrlTouched && isUrlInvalid}
              data-test-subj="webCrawlScheduleUrl"
            />
          </EuiFormRow>
          <EuiFlexGroup gutterSize="s" responsive={false}>
            <EuiFlexItem>
              <EuiFormRow
                label={MAX_DEPTH_LABEL}
                isInvalid={isMaxDepthInvalid}
                error={i18n.translate('xpack.webCrawler.crawls.schedule.invalidMaxDepth', {
                  defaultMessage: 'Enter a whole number from 0 to {max}.',
                  values: { max: WEB_CRAWL_MAX_DEPTH_LIMIT },
                })}
              >
                <EuiFieldNumber
                  min={0}
                  max={WEB_CRAWL_MAX_DEPTH_LIMIT}
                  step={1}
                  value={Number.isNaN(maxDepth) ? '' : maxDepth}
                  onChange={(event) => setMaxDepth(event.target.valueAsNumber)}
                  isInvalid={isMaxDepthInvalid}
                  data-test-subj="webCrawlScheduleMaxDepth"
                />
              </EuiFormRow>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFormRow
                label={MAX_DOCUMENTS_LABEL}
                isInvalid={isMaxDocumentsInvalid}
                error={i18n.translate('xpack.webCrawler.crawls.schedule.invalidMaxDocuments', {
                  defaultMessage: 'Enter a whole number from 1 to {max}.',
                  values: { max: WEB_CRAWL_MAX_DOCUMENTS_LIMIT },
                })}
              >
                <EuiFieldNumber
                  min={1}
                  max={WEB_CRAWL_MAX_DOCUMENTS_LIMIT}
                  step={1}
                  value={Number.isNaN(maxDocuments) ? '' : maxDocuments}
                  onChange={(event) => setMaxDocuments(event.target.valueAsNumber)}
                  isInvalid={isMaxDocumentsInvalid}
                  data-test-subj="webCrawlScheduleMaxDocuments"
                />
              </EuiFormRow>
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      )}
      <EuiFormRow
        label={EVERY_LABEL}
        isInvalid={isEveryInvalid || errorMessage !== undefined}
        error={
          isEveryInvalid
            ? i18n.translate('xpack.webCrawler.crawls.schedule.invalidEvery', {
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
              data-test-subj="webCrawlScheduleEvery"
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiSelect
              options={UNIT_OPTIONS}
              value={unit}
              onChange={(event) => setUnit(event.target.value as WebCrawlScheduleUnit)}
              aria-label={i18n.translate('xpack.webCrawler.crawls.schedule.unitLabel', {
                defaultMessage: 'Interval unit',
              })}
              data-test-subj="webCrawlScheduleUnit"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFormRow>
    </EuiConfirmModal>
  );
};
