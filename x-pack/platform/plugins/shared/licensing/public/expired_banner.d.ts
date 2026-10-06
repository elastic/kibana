/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
interface Props {
  type: string;
  uploadUrl: string;
}
type MountProps = Props & Pick<CoreStart, 'analytics' | 'i18n' | 'theme' | 'userProfile'>;
export declare const mountExpiredBanner: ({
  type,
  uploadUrl,
  ...startServices
}: MountProps) => import('@kbn/core/public').MountPoint;
export {};
