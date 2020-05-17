/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage, I18nProvider } from '@kbn/i18n/react';
import { BrowserRouter as Router } from 'react-router-dom';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiCode,
  EuiCodeBlock,
  EuiComboBox,
  EuiFormRow,
  EuiFlexGrid,
  EuiFieldText,
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiPageContentBody,
  EuiPageContentHeader,
  EuiPageHeader,
  EuiSteps,
  EuiTitle,
  EuiText,
} from '@elastic/eui';

import { EuiFlexItem } from '@elastic/eui';
import { EuiComboBoxOptionOption } from '@elastic/eui';
import { DataEnhancedStart } from '../../../../plugins/data_enhanced/public';
import { CoreStart } from '../../../../../src/core/public';
import { NavigationPublicPluginStart } from '../../../../../src/plugins/navigation/public';

import { PLUGIN_ID, PLUGIN_NAME } from '../../common';
import {
  DataPublicPluginStart,
  IndexPatternSelect,
  IndexPattern,
  IEsSearchRequest,
} from '../../../../../src/plugins/data/public';
import { backgroundSessionRouteHandler } from '../../server/routes/route_handler';
import { getRequest, doMyCustomSearch, getAggConfig } from './utils';

interface BackgroundSessionExampleAppDeps {
  basename: string;
  notifications: CoreStart['notifications'];
  http: CoreStart['http'];
  savedObjectsClient: CoreStart['savedObjects']['client'];
  navigation: NavigationPublicPluginStart;
  data: DataPublicPluginStart;
  dataEnhanced: DataEnhancedStart;
}

export const BackgroundSessionExampleApp = ({
  basename,
  notifications,
  savedObjectsClient,
  http,
  navigation,
  data,
  dataEnhanced,
}: BackgroundSessionExampleAppDeps) => {
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [indexPatternId, setIndexPatternId] = useState<string>();
  const [wordCount, setWordCount] = useState<string>('5');
  const [sessionHistory, setSessionHistory] = useState<Array<EuiComboBoxOptionOption<unknown>>>(
    JSON.parse(localStorage.getItem('sessionIds') || '[]')
  );

  /* Session management */

  const addSessionToHistory = (newSessionId: string | undefined, store: boolean) => {
    if (!newSessionId) return;
    const currentHistory = JSON.parse(localStorage.getItem('sessionIds') || '[]');
    if (currentHistory.find((item: any) => item.label === newSessionId) !== undefined) return;
    currentHistory.unshift({
      label: newSessionId,
    });
    // if (store) {
    localStorage.setItem('sessionIds', JSON.stringify(currentHistory));
    // }
    setSessionHistory(currentHistory);
  };

  const startNewSession = useCallback(() => {
    const newSessionId = data.search.session.start();
    addSessionToHistory(newSessionId, false);
    setSessionId(newSessionId);
  }, [data]);

  const getSessionSelector = () => {
    return (
      <EuiFlexGrid gutterSize="none">
        <EuiFlexItem>
          <EuiComboBox
            placeholder="Create or restore background session"
            isClearable={false}
            singleSelection={true}
            selectedOptions={sessionHistory.filter(item => item.label === sessionId)}
            onChange={selectedOptions => {
              if (selectedOptions.length) {
                const sid = selectedOptions[0].label;
                setSessionId(sid);
                data.search.session.set(sid);
              }
            }}
            options={sessionHistory}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiButtonEmpty onClick={startNewSession}>
            <FormattedMessage id="backgroundSessionExample.generateId" defaultMessage="New" />
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGrid>
    );
  };

  /* Results */

  const handleResults = async (response: any) => {
    addSessionToHistory(sessionId, true);
    notifications.toasts.addInfo(`Received ${response?.hits?.total} records.`);
  };

  /* Async search */

  const doAsyncSearch = async (request: IEsSearchRequest) => {
    request.sessionId = sessionId;
    data.search.search(request).subscribe((response: any) => {
      if (!response.is_partial && !response.is_running) {
        handleResults(response.rawResponse);
      }
    });
  };

  const onAsyncSearch = async () => {
    const request = await getRequest(data, indexPatternId!);
    doAsyncSearch(request);
  };

  /* Search Source */

  const onSearchSourceSearch = async () => {
    if (!indexPatternId) return;
    const indexPattern = await data.indexPatterns.get(indexPatternId);
    if (!indexPattern) return;
    const aggConfig = await getAggConfig(data, indexPatternId);
    doSearchSourceSearch(indexPattern, aggConfig);
  };

  const doSearchSourceSearch = async (indexPattern: IndexPattern, aggConfig: any) => {
    const searchSource = await data.search.searchSource.create();
    searchSource.setField('index', indexPattern);
    searchSource.setField('size', 0);
    searchSource.setField('aggs', aggConfig);
    searchSource.setSessionId(sessionId!);
    /* Pass a new ID to create a new session or an existing one to restore results. */
    const response = await searchSource.fetch();
    handleResults(response);

    /* Make sure to start a new session, once an old one is complete. */
  };

  /* Custom Search */

  const onBackgroundSession = async () => {
    const result = await doMyCustomSearch(http, sessionId!, wordCount);
    if (result.restored) {
      notifications.toasts.addInfo(
        `Session restored. Received ${result.wordsArray.length} records. First word is ${result.wordsArray[0]}.`
      );
    } else {
      notifications.toasts.addInfo(
        `Received ${result.wordsArray.length} records. First word is ${result.wordsArray[0]}.`
      );
      addSessionToHistory(sessionId, true);
    }

    /* Make sure to start a new session, once an old one is complete. */
  };

  /* Setup */

  useEffect(() => {
    const setDefaultIndexPattern = async () => {
      const defaultIndexPattern = await data.indexPatterns.getDefault();
      setIndexPatternId(defaultIndexPattern?.id);
    };

    setDefaultIndexPattern();
    startNewSession();
  }, [data, startNewSession]);

  const backgroundOptions = [
    {
      title: 'Search Source',
      children: (
        <EuiText>
          <p>
            The easiest way to incorporate Background Sessions into your solution is by using{' '}
            <EuiCode>SearchSource</EuiCode>
          </p>
          <EuiCodeBlock language="typescript">{doSearchSourceSearch.toString()}</EuiCodeBlock>
          <EuiFlexGrid columns={2} gutterSize="none">
            {/* <EuiFlexItem grow={true}>{getSessionSelector()}</EuiFlexItem> */}
            <EuiFlexItem grow={false}>
              <EuiButton type="primary" onClick={onSearchSourceSearch}>
                <FormattedMessage
                  id="backgroundSessionExample.searchSOurce"
                  defaultMessage="Use Search Source"
                />
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGrid>
        </EuiText>
      ),
    },
    {
      title: 'Search Service',
      children: (
        <EuiText>
          <p>
            If you want to have more granular control over your query strucure, you can use the
            <EuiCode>data</EuiCode> plugin&apos;s Search Service
          </p>
          <EuiCodeBlock language="typescript">{doAsyncSearch.toString()}</EuiCodeBlock>
          <EuiFlexGrid columns={2} gutterSize="none">
            {/* <EuiFlexItem grow={true}>{getSessionSelector()}</EuiFlexItem> */}
            <EuiFlexItem grow={false}>
              <EuiButton type="primary" onClick={onAsyncSearch}>
                <FormattedMessage
                  id="backgroundSessionExample.asyncSearch"
                  defaultMessage="Use Async Search"
                />
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGrid>
        </EuiText>
      ),
    },
    {
      title: 'Background Search Service',
      children: (
        <EuiText>
          <p>
            If you can&apos;t use neither of the previous options, you can still integrate with the
            background search service directly.
          </p>
          <p>
            <b>Server side:</b>
          </p>
          <EuiCodeBlock language="typescript">
            {backgroundSessionRouteHandler.toString()}
          </EuiCodeBlock>
          <EuiFlexItem grow={false}>
            <EuiFormRow label="Number of words">
              <EuiFieldText
                value={wordCount}
                onChange={e => {
                  setWordCount(e.target.value);
                }}
              />
            </EuiFormRow>
            <EuiFormRow>
              <EuiButton type="primary" onClick={onBackgroundSession}>
                <FormattedMessage
                  id="backgroundSessionExample.backgroundSessionService"
                  defaultMessage="Use Background Session Service directly"
                />
              </EuiButton>
            </EuiFormRow>
          </EuiFlexItem>
        </EuiText>
      ),
    },
  ];

  // Render the application DOM.
  // Note that `navigation.ui.TopNavMenu` is a stateful component exported on the `navigation` plugin's start contract.
  return (
    <Router basename={basename}>
      <I18nProvider>
        <>
          <navigation.ui.TopNavMenu appName={PLUGIN_ID} showSearchBar={true} />
          <EuiPage restrictWidth="1000px">
            <EuiPageBody>
              <EuiPageHeader>
                <EuiTitle size="l">
                  <h1>
                    <FormattedMessage
                      id="backgroundSessionExample.helloWorldText"
                      defaultMessage="{name}"
                      values={{ name: PLUGIN_NAME }}
                    />
                  </h1>
                </EuiTitle>
              </EuiPageHeader>
              <EuiPageContent>
                <EuiPageContentHeader>
                  <EuiTitle>
                    <h2>
                      <FormattedMessage
                        id="backgroundSessionExample.congratulationsTitle"
                        defaultMessage="How can I incorporate Background Sessions into my solution?"
                      />
                    </h2>
                  </EuiTitle>
                </EuiPageContentHeader>
                <EuiPageContentBody>
                  <EuiText>
                    <EuiFlexGrid columns={1}>
                      <EuiFlexItem>
                        <IndexPatternSelect
                          savedObjectsClient={savedObjectsClient}
                          placeholder={i18n.translate(
                            'backgroundSessionExample.selectIndexPatternPlaceholder',
                            {
                              defaultMessage: 'Select index pattern',
                            }
                          )}
                          indexPatternId={indexPatternId || ''}
                          onChange={(newIndexPatternId: any) => {
                            setIndexPatternId(newIndexPatternId);
                          }}
                          isClearable={false}
                        />
                      </EuiFlexItem>

                      <EuiFlexItem grow={true}>{getSessionSelector()}</EuiFlexItem>

                      <EuiFlexItem grow={false}>
                        <EuiSteps steps={backgroundOptions} />
                      </EuiFlexItem>
                    </EuiFlexGrid>
                  </EuiText>
                </EuiPageContentBody>
              </EuiPageContent>
            </EuiPageBody>
          </EuiPage>
        </>
      </I18nProvider>
    </Router>
  );
};
