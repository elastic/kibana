/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFieldText, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export const INVALID_PATHS_MESSAGE = i18n.translate('xpack.webCrawler.pathRules.invalid', {
  defaultMessage: 'Enter up to 20 paths that start with a /, separated by commas.',
});

const PLACEHOLDER = '/docs, /blog';

interface WebCrawlPathRulesProps {
  includePaths: string;
  excludePaths: string;
  isIncludeInvalid: boolean;
  isExcludeInvalid: boolean;
  onIncludePathsChange: (value: string) => void;
  onExcludePathsChange: (value: string) => void;
  isDisabled?: boolean;
  compressed?: boolean;
}

/** Takes the path prefixes a crawl is limited to and the ones it leaves out, as comma-separated lists. */
export const WebCrawlPathRules = ({
  includePaths,
  excludePaths,
  isIncludeInvalid,
  isExcludeInvalid,
  onIncludePathsChange,
  onExcludePathsChange,
  isDisabled = false,
  compressed = false,
}: WebCrawlPathRulesProps) => (
  <EuiFlexGroup gutterSize="s">
    <EuiFlexItem>
      <EuiFieldText
        fullWidth
        compressed={compressed}
        prepend={i18n.translate('xpack.webCrawler.pathRules.include', {
          defaultMessage: 'Only paths',
        })}
        aria-label={i18n.translate('xpack.webCrawler.pathRules.includeAriaLabel', {
          defaultMessage: 'Only crawl pages under these paths, separated by commas',
        })}
        placeholder={PLACEHOLDER}
        value={includePaths}
        onChange={(event) => onIncludePathsChange(event.target.value)}
        isInvalid={isIncludeInvalid}
        disabled={isDisabled}
        data-test-subj="webCrawlIncludePaths"
      />
    </EuiFlexItem>
    <EuiFlexItem>
      <EuiFieldText
        fullWidth
        compressed={compressed}
        prepend={i18n.translate('xpack.webCrawler.pathRules.exclude', {
          defaultMessage: 'Skip paths',
        })}
        aria-label={i18n.translate('xpack.webCrawler.pathRules.excludeAriaLabel', {
          defaultMessage: 'Do not crawl pages under these paths, separated by commas',
        })}
        placeholder="/tags, /search"
        value={excludePaths}
        onChange={(event) => onExcludePathsChange(event.target.value)}
        isInvalid={isExcludeInvalid}
        disabled={isDisabled}
        data-test-subj="webCrawlExcludePaths"
      />
    </EuiFlexItem>
  </EuiFlexGroup>
);
