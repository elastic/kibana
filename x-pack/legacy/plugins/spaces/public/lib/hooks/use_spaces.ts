/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useState } from 'react';
import { kfetch } from 'ui/kfetch';
import { Space } from '../../../common/model/space';

export const useKibanaSpaces = () => {
  const [spaces, setSpaces] = useState([] as Space[]);

  useEffect(() => {
    kfetch({ pathname: '/api/spaces/space' }).then((response: Space[]) => {
      setSpaces(response);
    });
  }, []);

  return spaces;
};
