import React from 'react';
import type { CoreStart } from '@kbn/core/public';
import type { ChangePasswordProps } from './change_password';
export declare const getChangePasswordComponent: (core: CoreStart) => Promise<React.FC<ChangePasswordProps>>;
