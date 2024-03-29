/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';

const EVENT_NAME_PREFIX = 'local-storage-listener';

export function useLocalStorageListener(key: string, initValue: any) {
  const [state, setState] = useState(() => {
    const value = localStorage.getItem(key);
    if (value !== null) {
      try {
        return JSON.parse(value);
      } catch (e) {
        return null;
      }
    }

    localStorage.setItem(key, JSON.stringify(initValue));
    window.dispatchEvent(new Event(`${EVENT_NAME_PREFIX}${key}`));
    return initValue;
  });

  useEffect(() => {
    const value = localStorage.getItem(key);
    if (value !== JSON.stringify(state)) {
      localStorage.setItem(key, JSON.stringify(state));
      window.dispatchEvent(new Event(`${EVENT_NAME_PREFIX}${key}`));
    }
  }, [key, state]);

  useEffect(() => {
    const listenStorageChange = () => {
      setState(() => {
        const value = localStorage.getItem(key);
        if (value !== null) {
          try {
            return JSON.parse(value);
          } catch (e) {
            return null;
          }
        }

        if (initValue !== null) {
          localStorage.setItem(key, JSON.stringify(initValue));
          window.dispatchEvent(new Event(`${EVENT_NAME_PREFIX}${key}`));
          return initValue;
        }

        return null;
      });
    };
    window.addEventListener(`${EVENT_NAME_PREFIX}${key}`, listenStorageChange);
    return () => window.removeEventListener(`${EVENT_NAME_PREFIX}${key}`, listenStorageChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return [state, setState];
}
