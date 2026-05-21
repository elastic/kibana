/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { useKibana } from '../../hooks/use_kibana';
import type { AwsEpmPackageInfo } from './aws_epm_api';
import { getEpmPackageFileApiPath, getEpmPackageInfoApiPath } from './aws_epm_api';

const FLEET_API_VERSION = '2023-10-31';

export interface UseAwsEpmPackageOverviewResult {
  readonly packageInfo: AwsEpmPackageInfo | undefined;
  readonly readmeMarkdown: string | undefined;
  readonly isLoading: boolean;
  readonly error: Error | undefined;
}

export const useAwsEpmPackageOverview = (): UseAwsEpmPackageOverviewResult => {
  const {
    core: { http },
  } = useKibana();

  const [packageInfo, setPackageInfo] = useState<AwsEpmPackageInfo | undefined>();
  const [readmeMarkdown, setReadmeMarkdown] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | undefined>();

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      setError(undefined);

      try {
        const { item } = await http.get<{ item: AwsEpmPackageInfo }>(
          getEpmPackageInfoApiPath('aws'),
          {
            query: { withMetadata: true },
            version: FLEET_API_VERSION,
          }
        );

        if (cancelled) {
          return;
        }

        setPackageInfo(item);

        const readmePath = item.readme;
        if (!readmePath) {
          setReadmeMarkdown('');
          return;
        }

        const markdown = await http.get<string>(getEpmPackageFileApiPath(readmePath), {
          version: FLEET_API_VERSION,
        });

        if (!cancelled) {
          setReadmeMarkdown(markdown ?? '');
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [http]);

  return { packageInfo, readmeMarkdown, isLoading, error };
};
