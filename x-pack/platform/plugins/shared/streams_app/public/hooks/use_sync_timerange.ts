/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useKibana } from './use_kibana';
import { useStreamsAppParams } from './use_streams_app_params';

export function useSyncTimerange() {
  const {
    dependencies: {
      start: { data },
    },
  } = useKibana();

  const { query } = useStreamsAppParams('/*');
  const { rangeFrom, rangeTo } =
    'rangeFrom' in query ? query : { rangeFrom: undefined, rangeTo: undefined };

  useMemo(() => {
    // hook into useMemo to sync update time of timefilter
    if (rangeFrom && rangeTo) {
      data.query.timefilter.timefilter.setTime({
        from: rangeFrom,
        to: rangeTo,
      });
    }
  }, [rangeFrom, rangeTo, data]);
}
