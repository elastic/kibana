/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiAccordion,
  EuiFieldText,
  EuiFormRow,
  EuiSpacer,
  EuiTextArea,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { WEB_CRAWL_MAX_SEED_URLS, WEB_CRAWL_MAX_SITEMAP_URLS } from '../../common/constants';
import type { WebCrawlStartRequest } from '../../common/types';
import { areUrlsValid, isValidIndexName, parseUrlList } from '../validation';

const INDEX_NAME_LABEL = i18n.translate('xpack.webCrawler.targets.indexName', {
  defaultMessage: 'Index',
});
const SEED_URLS_LABEL = i18n.translate('xpack.webCrawler.targets.seedUrls', {
  defaultMessage: 'More start URLs',
});
const SITEMAP_URLS_LABEL = i18n.translate('xpack.webCrawler.targets.sitemapUrls', {
  defaultMessage: 'Sitemap URLs',
});

type CrawlTargets = Pick<WebCrawlStartRequest, 'indexName' | 'seedUrls' | 'sitemapUrls'>;

export interface CrawlTargetFields {
  indexName: string;
  seedUrls: string;
  sitemapUrls: string;
  setIndexName: (value: string) => void;
  setSeedUrls: (value: string) => void;
  setSitemapUrls: (value: string) => void;
  isIndexNameInvalid: boolean;
  areSeedUrlsInvalid: boolean;
  areSitemapUrlsInvalid: boolean;
  isInvalid: boolean;
  /** What the fields ask for, with an empty index name meaning the default index. */
  targets: Required<Omit<CrawlTargets, 'indexName'>> & Pick<CrawlTargets, 'indexName'>;
}

/** Holds what is typed into `WebCrawlTargets`, and what it amounts to. */
export const useCrawlTargetFields = (initial: CrawlTargets = {}): CrawlTargetFields => {
  const [indexName, setIndexName] = useState(initial.indexName ?? '');
  const [seedUrls, setSeedUrls] = useState(initial.seedUrls?.join('\n') ?? '');
  const [sitemapUrls, setSitemapUrls] = useState(initial.sitemapUrls?.join('\n') ?? '');
  const trimmedIndexName = indexName.trim();
  const parsedSeedUrls = parseUrlList(seedUrls);
  const parsedSitemapUrls = parseUrlList(sitemapUrls);
  const isIndexNameInvalid = trimmedIndexName !== '' && !isValidIndexName(trimmedIndexName);
  const areSeedUrlsInvalid = !areUrlsValid(parsedSeedUrls, WEB_CRAWL_MAX_SEED_URLS);
  const areSitemapUrlsInvalid = !areUrlsValid(parsedSitemapUrls, WEB_CRAWL_MAX_SITEMAP_URLS);

  return {
    indexName,
    seedUrls,
    sitemapUrls,
    setIndexName,
    setSeedUrls,
    setSitemapUrls,
    isIndexNameInvalid,
    areSeedUrlsInvalid,
    areSitemapUrlsInvalid,
    isInvalid: isIndexNameInvalid || areSeedUrlsInvalid || areSitemapUrlsInvalid,
    targets: {
      indexName: trimmedIndexName === '' ? undefined : trimmedIndexName,
      seedUrls: parsedSeedUrls,
      sitemapUrls: parsedSitemapUrls,
    },
  };
};

interface WebCrawlTargetsProps {
  fields: CrawlTargetFields;
  isDisabled?: boolean;
  compressed?: boolean;
}

/**
 * The options that widen a crawl beyond one site in its own index: the index to crawl into, more
 * pages to start from, and sitemaps to read.
 */
export const WebCrawlTargets = ({
  fields,
  isDisabled = false,
  compressed = false,
}: WebCrawlTargetsProps) => {
  const accordionId = useGeneratedHtmlId({ prefix: 'webCrawlTargets' });
  const [isOpen, setIsOpen] = useState(false);
  const display = compressed ? 'rowCompressed' : 'row';

  return (
    <EuiAccordion
      id={accordionId}
      buttonContent={i18n.translate('xpack.webCrawler.targets.title', {
        defaultMessage: 'Index, start URLs and sitemaps',
      })}
      paddingSize="s"
      // An invalid field stays in view: its error is what explains why the crawl cannot start.
      forceState={isOpen || fields.isInvalid ? 'open' : 'closed'}
      onToggle={(isOpening) => {
        if (isOpening || !fields.isInvalid) {
          setIsOpen(isOpening);
        }
      }}
      data-test-subj="webCrawlTargets"
    >
      <EuiFormRow
        fullWidth
        display={display}
        label={INDEX_NAME_LABEL}
        helpText={i18n.translate('xpack.webCrawler.targets.indexNameHelp', {
          defaultMessage:
            'Leave empty to use the index named after the site. Crawl several sites into one index by giving them the same name.',
        })}
        isInvalid={fields.isIndexNameInvalid}
        error={i18n.translate('xpack.webCrawler.targets.indexNameInvalid', {
          defaultMessage:
            'Start with a lowercase letter or a digit, and use only lowercase letters, digits, dots, hyphens and underscores.',
        })}
      >
        <EuiFieldText
          fullWidth
          compressed={compressed}
          placeholder="web-crawl-docs"
          aria-label={INDEX_NAME_LABEL}
          value={fields.indexName}
          onChange={(event) => fields.setIndexName(event.target.value)}
          isInvalid={fields.isIndexNameInvalid}
          disabled={isDisabled}
          data-test-subj="webCrawlIndexName"
        />
      </EuiFormRow>
      <EuiSpacer size="s" />
      <EuiFormRow
        fullWidth
        display={display}
        label={SEED_URLS_LABEL}
        helpText={i18n.translate('xpack.webCrawler.targets.seedUrlsHelp', {
          defaultMessage:
            'Other pages to start from, one per line. They can be on other sites, which are then crawled too.',
        })}
        isInvalid={fields.areSeedUrlsInvalid}
        error={i18n.translate('xpack.webCrawler.targets.seedUrlsInvalid', {
          defaultMessage: 'Enter up to {max} URLs that start with http:// or https://',
          values: { max: WEB_CRAWL_MAX_SEED_URLS },
        })}
      >
        <EuiTextArea
          fullWidth
          compressed={compressed}
          rows={2}
          resize="vertical"
          placeholder="https://docs.example.com"
          aria-label={SEED_URLS_LABEL}
          value={fields.seedUrls}
          onChange={(event) => fields.setSeedUrls(event.target.value)}
          isInvalid={fields.areSeedUrlsInvalid}
          disabled={isDisabled}
          data-test-subj="webCrawlSeedUrls"
        />
      </EuiFormRow>
      <EuiSpacer size="s" />
      <EuiFormRow
        fullWidth
        display={display}
        label={SITEMAP_URLS_LABEL}
        helpText={i18n.translate('xpack.webCrawler.targets.sitemapUrlsHelp', {
          defaultMessage: 'Sitemaps to read besides the ones the sites declare, one per line.',
        })}
        isInvalid={fields.areSitemapUrlsInvalid}
        error={i18n.translate('xpack.webCrawler.targets.sitemapUrlsInvalid', {
          defaultMessage: 'Enter up to {max} URLs that start with http:// or https://',
          values: { max: WEB_CRAWL_MAX_SITEMAP_URLS },
        })}
      >
        <EuiTextArea
          fullWidth
          compressed={compressed}
          rows={2}
          resize="vertical"
          placeholder="https://example.com/sitemap-docs.xml"
          aria-label={SITEMAP_URLS_LABEL}
          value={fields.sitemapUrls}
          onChange={(event) => fields.setSitemapUrls(event.target.value)}
          isInvalid={fields.areSitemapUrlsInvalid}
          disabled={isDisabled}
          data-test-subj="webCrawlSitemapUrls"
        />
      </EuiFormRow>
    </EuiAccordion>
  );
};
