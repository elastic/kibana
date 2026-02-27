/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useState } from 'react';
import { Subscription } from 'rxjs';
import { map, distinctUntilChanged } from 'rxjs';
import { DatePickerWrapper } from '@kbn/ml-date-picker';
import { useMlKibana } from '../../contexts/kibana';

export const DatePicker = () => {
  const {
    services: {
      mlServices: { httpService },
    },
  } = useMlKibana();

  useEffect(() => {
    const subscriptions = new Subscription();

    subscriptions.add(
      httpService.getLoadingCount$
        .pipe(
          map((v) => v !== 0),
          distinctUntilChanged()
        )
        .subscribe((loading) => {
          setIsLoading(loading);
        })
    );
    return function cleanup() {
      subscriptions.unsubscribe();
    };
  }, [httpService?.getLoadingCount$]);

  const [isLoading, setIsLoading] = useState(false);

  return (
    <DatePickerWrapper
      isLoading={isLoading}
      width="full"
      dataTestSubj="mlDatePickerRefreshPageButton"
    />
  );
};
