/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useState } from 'react';
import { kfetch } from 'ui/kfetch';
import { Space } from '../../../common/model/space';
import { GetSpacePurpose } from '../../../common/model/types';

export const useKibanaSpaces = (purpose?: GetSpacePurpose) => {
  const [spaces, setSpaces] = useState([] as Space[]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    kfetch({ pathname: '/api/spaces/space', query: { purpose } }).then((response: Space[]) => {
      setSpaces(response);
      setIsLoading(false);
    });
  }, [purpose]);

  return {
    isLoading,
    spaces,
  };
};
