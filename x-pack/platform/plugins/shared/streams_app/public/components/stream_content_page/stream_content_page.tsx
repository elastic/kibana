/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo } from 'react';
import { EuiEmptyPrompt, EuiLoadingSpinner, EuiText, EuiButton, EuiIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useSearchParams } from 'react-router-dom-v5-compat';
import { StreamContentPopover } from '../stream_content_popover';
import {
  detectStreamContext,
  type StreamContextDetectionResult,
} from '../../util/stream_context_detection';
import { useKibana } from '../../hooks/use_kibana';
import { useStreamsAppRouter } from '../../hooks/use_streams_app_router';
import { useTimeRange } from '../../hooks/use_time_range';

/**
 * Page component that handles the Stream Content display.
 *
 * This page is accessed from the navigation and performs context detection
 * to determine which stream's content to display. If a stream context is
 * detected (from URL params, previous page's ES|QL query, etc.), it shows
 * the content popover. Otherwise, it prompts the user to select a stream.
 */
export function StreamContentPage() {
  const [searchParams] = useSearchParams();
  const router = useStreamsAppRouter();
  const { rangeFrom, rangeTo } = useTimeRange();
  const {
    core: {
      http: { basePath },
      application,
    },
  } = useKibana();

  const [isPopoverOpen, setIsPopoverOpen] = useState(true);

  // Check for stream context from various sources
  const contextResult = useMemo<StreamContextDetectionResult>(() => {
    // First check URL params (highest priority)
    const streamParam = searchParams.get('stream') || searchParams.get('streamName');
    if (streamParam) {
      return {
        streamName: streamParam,
        source: 'url_param',
      };
    }

    // Check for returnTo parameter which may contain context from previous page
    const returnTo = searchParams.get('returnTo');
    if (returnTo) {
      try {
        const returnUrl = new URL(returnTo, window.location.origin);
        const result = detectStreamContext(
          {
            pathname: returnUrl.pathname,
            search: returnUrl.search,
            hash: returnUrl.hash,
          },
          { prepend: basePath.prepend }
        );
        if (result.streamName) {
          return result;
        }
      } catch {
        // Invalid URL, ignore
      }
    }

    // Fallback: Check if we can detect from stored session state
    // (This could be enhanced to check sessionStorage or other sources)
    return {
      streamName: undefined,
      source: 'none',
    };
  }, [searchParams, basePath]);

  const handleClosePopover = () => {
    setIsPopoverOpen(false);
    // Navigate back or to streams list
    const returnTo = searchParams.get('returnTo');
    if (returnTo) {
      application.navigateToUrl(returnTo);
    } else {
      application.navigateToUrl(
        router.link('/', {
          query: { rangeFrom, rangeTo },
        })
      );
    }
  };

  const handleGoToStreamsList = () => {
    application.navigateToUrl(
      router.link('/', {
        query: { rangeFrom, rangeTo },
      })
    );
  };

  // If no stream context is detected, show a prompt
  if (!contextResult.streamName) {
    return (
      <EuiEmptyPrompt
        icon={<EuiIcon type="productStreamsWired" size="xl" />}
        title={
          <h2>
            {i18n.translate('xpack.streams.contentPage.noContext.title', {
              defaultMessage: 'No stream context detected',
            })}
          </h2>
        }
        body={
          <EuiText>
            <p>
              {i18n.translate('xpack.streams.contentPage.noContext.description', {
                defaultMessage:
                  'Navigate to Discover with an ES|QL query (e.g., FROM logs.mystream) or select a stream below to view its content.',
              })}
            </p>
          </EuiText>
        }
        actions={
          <EuiButton onClick={handleGoToStreamsList} fill>
            {i18n.translate('xpack.streams.contentPage.noContext.browseStreams', {
              defaultMessage: 'Browse streams',
            })}
          </EuiButton>
        }
        data-test-subj="streamsAppContentPageNoContext"
      />
    );
  }

  // Show the content popover for the detected stream
  if (isPopoverOpen) {
    return (
      <StreamContentPopover
        streamName={contextResult.streamName}
        onClose={handleClosePopover}
        contextSource={contextResult.source}
      />
    );
  }

  // If popover was closed, show a minimal view
  return (
    <EuiEmptyPrompt
      icon={<EuiLoadingSpinner size="l" />}
      title={<span />}
      body={
        <EuiText color="subdued">
          {i18n.translate('xpack.streams.contentPage.redirecting', {
            defaultMessage: 'Redirecting...',
          })}
        </EuiText>
      }
    />
  );
}
