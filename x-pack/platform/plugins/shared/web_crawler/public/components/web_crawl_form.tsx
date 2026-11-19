/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import type { FormEvent } from 'react';
import {
  EuiAccordion,
  EuiButton,
  EuiFieldNumber,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSpacer,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  WEB_CRAWL_DEFAULT_MAX_DEPTH,
  WEB_CRAWL_DEFAULT_MAX_DOCUMENTS,
  WEB_CRAWL_MAX_DEPTH_LIMIT,
  WEB_CRAWL_MAX_DOCUMENTS_LIMIT,
} from '../../common/constants';
import type { WebCrawlStartRequest } from '../../common/types';
import { useTelemetryId } from '../context';
import type { WebCrawlOptionsDisplay } from '../types';
import {
  arePathPrefixesValid,
  isCrawlableUrl,
  isIntegerInRange,
  parsePathPrefixes,
} from '../validation';
import { INVALID_PATHS_MESSAGE, WebCrawlPathRules } from './web_crawl_path_rules';
import { WebCrawlTargets, useCrawlTargetFields } from './web_crawl_targets';

const INVALID_URL_MESSAGE = i18n.translate('xpack.webCrawler.panel.invalidUrl', {
  defaultMessage: 'Enter a URL that starts with http:// or https://',
});

const INVALID_LIMITS_MESSAGE = i18n.translate('xpack.webCrawler.panel.invalidLimits', {
  defaultMessage:
    'Max depth must be a whole number from 0 to {depthLimit}, and max pages from 1 to {documentsLimit}.',
  values: {
    depthLimit: WEB_CRAWL_MAX_DEPTH_LIMIT,
    documentsLimit: WEB_CRAWL_MAX_DOCUMENTS_LIMIT,
  },
});

const URL_LABEL = i18n.translate('xpack.webCrawler.panel.label', {
  defaultMessage: 'Crawl a website',
});

interface WebCrawlFormProps {
  onSubmit: (request: WebCrawlStartRequest) => void;
  isStarting: boolean;
  /** The server's answer to the last submission, when it refused it. */
  errorMessage?: string;
  /** `collapsed` leaves the URL in view and keeps every other field behind one disclosure. */
  optionsDisplay?: WebCrawlOptionsDisplay;
}

/** Takes the URL and limits of a crawl. Several crawls can run at once, so it stays enabled while they do. */
export const WebCrawlForm = ({
  onSubmit,
  isStarting,
  errorMessage,
  optionsDisplay = 'inline',
}: WebCrawlFormProps) => {
  const getTelemetryId = useTelemetryId();
  const optionsAccordionId = useGeneratedHtmlId({ prefix: 'webCrawlOptions' });
  const [areOptionsOpen, setAreOptionsOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [isUrlInvalid, setIsUrlInvalid] = useState(false);
  const [maxDepth, setMaxDepth] = useState(WEB_CRAWL_DEFAULT_MAX_DEPTH);
  const [maxDocuments, setMaxDocuments] = useState(WEB_CRAWL_DEFAULT_MAX_DOCUMENTS);
  const isMaxDepthInvalid = !isIntegerInRange(maxDepth, 0, WEB_CRAWL_MAX_DEPTH_LIMIT);
  const isMaxDocumentsInvalid = !isIntegerInRange(maxDocuments, 1, WEB_CRAWL_MAX_DOCUMENTS_LIMIT);
  const [includePathsText, setIncludePathsText] = useState('');
  const [excludePathsText, setExcludePathsText] = useState('');
  const isIncludeInvalid = !arePathPrefixesValid(parsePathPrefixes(includePathsText));
  const isExcludeInvalid = !arePathPrefixesValid(parsePathPrefixes(excludePathsText));
  const hasInvalidPaths = isIncludeInvalid || isExcludeInvalid;
  const targetFields = useCrawlTargetFields();
  const { isInvalid: hasInvalidTargets, targets } = targetFields;

  const handleSubmit = useCallback(
    (event: FormEvent) => {
      event.preventDefault();
      const trimmedUrl = url.trim();
      if (!isCrawlableUrl(trimmedUrl)) {
        setIsUrlInvalid(true);
        return;
      }
      if (isMaxDepthInvalid || isMaxDocumentsInvalid || hasInvalidPaths || hasInvalidTargets) {
        return;
      }
      onSubmit({
        url: trimmedUrl,
        maxDepth,
        maxDocuments,
        includePaths: parsePathPrefixes(includePathsText),
        excludePaths: parsePathPrefixes(excludePathsText),
        ...targets,
      });
    },
    [
      url,
      maxDepth,
      maxDocuments,
      includePathsText,
      excludePathsText,
      isMaxDepthInvalid,
      isMaxDocumentsInvalid,
      hasInvalidPaths,
      hasInvalidTargets,
      targets,
      onSubmit,
    ]
  );

  const limitsError =
    isMaxDepthInvalid || isMaxDocumentsInvalid ? INVALID_LIMITS_MESSAGE : undefined;
  const pathsError = hasInvalidPaths ? INVALID_PATHS_MESSAGE : undefined;
  const error = isUrlInvalid ? INVALID_URL_MESSAGE : limitsError ?? pathsError ?? errorMessage;
  const hasInvalidOptions =
    isMaxDepthInvalid || isMaxDocumentsInvalid || hasInvalidPaths || hasInvalidTargets;

  const options = (
    <>
      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem>
          <EuiFieldNumber
            fullWidth
            compressed
            prepend={i18n.translate('xpack.webCrawler.panel.maxDepth', {
              defaultMessage: 'Max depth',
            })}
            aria-label={i18n.translate('xpack.webCrawler.panel.maxDepthAriaLabel', {
              defaultMessage: 'Maximum number of links away from the URL, 0 to {limit}',
              values: { limit: WEB_CRAWL_MAX_DEPTH_LIMIT },
            })}
            min={0}
            max={WEB_CRAWL_MAX_DEPTH_LIMIT}
            step={1}
            value={Number.isNaN(maxDepth) ? '' : maxDepth}
            onChange={(event) => setMaxDepth(event.target.valueAsNumber)}
            isInvalid={isMaxDepthInvalid}
            disabled={isStarting}
            data-test-subj="webCrawlMaxDepth"
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFieldNumber
            fullWidth
            compressed
            prepend={i18n.translate('xpack.webCrawler.panel.maxDocuments', {
              defaultMessage: 'Max pages',
            })}
            aria-label={i18n.translate('xpack.webCrawler.panel.maxDocumentsAriaLabel', {
              defaultMessage: 'Maximum number of pages to index, 1 to {limit}',
              values: { limit: WEB_CRAWL_MAX_DOCUMENTS_LIMIT },
            })}
            min={1}
            max={WEB_CRAWL_MAX_DOCUMENTS_LIMIT}
            step={1}
            value={Number.isNaN(maxDocuments) ? '' : maxDocuments}
            onChange={(event) => setMaxDocuments(event.target.valueAsNumber)}
            isInvalid={isMaxDocumentsInvalid}
            disabled={isStarting}
            data-test-subj="webCrawlMaxDocuments"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <WebCrawlPathRules
        compressed
        includePaths={includePathsText}
        excludePaths={excludePathsText}
        isIncludeInvalid={isIncludeInvalid}
        isExcludeInvalid={isExcludeInvalid}
        onIncludePathsChange={setIncludePathsText}
        onExcludePathsChange={setExcludePathsText}
        isDisabled={isStarting}
      />
      <EuiSpacer size="s" />
      <WebCrawlTargets compressed fields={targetFields} isDisabled={isStarting} />
    </>
  );

  return (
    <form onSubmit={handleSubmit} noValidate>
      <EuiFormRow
        fullWidth
        label={URL_LABEL}
        helpText={i18n.translate('xpack.webCrawler.panel.helpText', {
          defaultMessage:
            "Follows the site's links and sitemap, respects its robots.txt, and indexes the pages for full-text and semantic search.",
        })}
        isInvalid={error !== undefined}
        error={error}
      >
        <EuiFlexGroup gutterSize="s" responsive={false}>
          <EuiFlexItem>
            <EuiFieldText
              fullWidth
              compressed
              icon="globe"
              placeholder="https://example.com"
              aria-label={URL_LABEL}
              value={url}
              onChange={(event) => {
                setUrl(event.target.value);
                setIsUrlInvalid(false);
              }}
              isInvalid={isUrlInvalid}
              disabled={isStarting}
              data-test-subj="webCrawlUrl"
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              type="submit"
              size="s"
              isLoading={isStarting}
              data-test-subj="webCrawlSubmit"
              data-telemetry-id={getTelemetryId('webCrawl-start')}
            >
              {i18n.translate('xpack.webCrawler.panel.submit', {
                defaultMessage: 'Crawl',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFormRow>
      <EuiSpacer size="s" />
      {optionsDisplay === 'collapsed' ? (
        <EuiAccordion
          id={optionsAccordionId}
          buttonContent={i18n.translate('xpack.webCrawler.panel.advancedOptions', {
            defaultMessage: 'Advanced options',
          })}
          paddingSize="s"
          // An invalid field stays in view: its error is what explains why the crawl cannot start.
          forceState={areOptionsOpen || hasInvalidOptions ? 'open' : 'closed'}
          onToggle={(isOpening) => {
            if (isOpening || !hasInvalidOptions) {
              setAreOptionsOpen(isOpening);
            }
          }}
          data-test-subj="webCrawlAdvancedOptions"
          data-telemetry-id={getTelemetryId('webCrawl-advancedOptions')}
        >
          {options}
        </EuiAccordion>
      ) : (
        options
      )}
    </form>
  );
};
