/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { useActions, useValues } from 'kea';

import { Routes, Route } from '@kbn/shared-ux-router';

import { useKibana } from '@kbn/kibana-react-plugin/public';
import { CONNECTOR_DETAIL_PATH, CONNECTOR_DETAIL_TAB_PATH } from '../routes';

import { IndexNameLogic } from '../search_index/index_name_logic';

import { IndexViewLogic } from '../search_index/index_view_logic';

import { ConnectorDetail } from './connector_detail';
import { ConnectorViewLogic } from './connector_view_logic';

export const ConnectorDetailRouter: React.FC = () => {
  const {
    services: { http },
  } = useKibana();
  useEffect(() => {
    const unmountName = IndexNameLogic.mount();
    const unmountView = ConnectorViewLogic({ http }).mount();
    const unmountIndexView = IndexViewLogic({ http }).mount();
    return () => {
      unmountName();
      unmountView();
      unmountIndexView();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const { setIndexName } = useActions(IndexNameLogic);
  const { connector } = useValues(ConnectorViewLogic({ http }));
  const { startFetchIndexPoll, stopFetchIndexPoll, resetFetchIndexApi } = useActions(
    IndexViewLogic({ http })
  );
  const indexName = connector?.index_name || '';
  useEffect(() => {
    setIndexName(indexName);
    if (indexName) {
      startFetchIndexPoll(indexName);
    } else {
      stopFetchIndexPoll();
      resetFetchIndexApi();
    }
  }, [indexName, resetFetchIndexApi, setIndexName, startFetchIndexPoll, stopFetchIndexPoll]);

  return (
    <Routes>
      <Route path={CONNECTOR_DETAIL_PATH} exact>
        <ConnectorDetail />
      </Route>
      <Route path={CONNECTOR_DETAIL_TAB_PATH}>
        <ConnectorDetail />
      </Route>
    </Routes>
  );
};
