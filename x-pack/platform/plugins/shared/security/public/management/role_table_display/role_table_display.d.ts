import React from 'react';
import type { ApplicationStart } from '@kbn/core/public';
import type { Role } from '../../../common';
interface Props {
    role: Role | string;
    navigateToApp: ApplicationStart['navigateToApp'];
}
export declare const RoleTableDisplay: ({ role, navigateToApp }: Props) => React.JSX.Element;
export {};
