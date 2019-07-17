/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useContext, useEffect, useState } from 'react';
import { getIndexPatterns } from '../api';
import { KibanaConfigContext } from '../../../lib/adapters/framework/kibana_framework_adapter';
import { useStateToaster } from '../../toasters';
import { errorToToaster } from '../../ml/api/error_to_toaster';

type Return = [boolean, string];

export const useIndexPatterns = (refreshToggle = false): Return => {
  const [indexPattern, setIndexPattern] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const config = useContext(KibanaConfigContext);
  const [, dispatchToaster] = useStateToaster();

  const fetchFunc = async () => {
    try {
      const data = await getIndexPatterns({
        'kbn-version': config.kbnVersion,
      });

      setIndexPattern(data);
      setIsLoading(false);
    } catch (error) {
      errorToToaster({ title: 'Index pattern fetch failure', error, dispatchToaster });
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    fetchFunc();
  }, [refreshToggle]);

  return [isLoading, indexPattern];
};
