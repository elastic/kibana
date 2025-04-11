/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useLocation } from 'react-router-dom';
import { parse, stringify, type StringifyOptions } from 'query-string';
import { useCallback, useEffect, useState } from 'react';

/**
 * Parses `search` params and returns an object with them along with a `toUrlParams` function
 * that allows being able to retrieve a stringified version of an object (default is the
 * `urlParams` that was parsed) for use in the url.
 * Object will be recreated every time `search` changes.
 */
export function useUrlParams() {
  const { search } = useLocation();
  const [urlParams, setUrlParams] = useState(() => parse(search));
  const toUrlParams = useCallback(
    (params = urlParams, options?: StringifyOptions) => stringify(params, options),
    [urlParams]
  );
  useEffect(() => {
    setUrlParams(parse(search));
  }, [search]);
  return {
    urlParams,
    toUrlParams,
  };
}
