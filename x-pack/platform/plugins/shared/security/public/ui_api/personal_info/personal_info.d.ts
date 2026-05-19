import React from 'react';
import type { AuthenticatedUser } from '../../../common';
export interface PersonalInfoProps {
    user: AuthenticatedUser;
}
export declare const PersonalInfo: (props: PersonalInfoProps) => React.JSX.Element;
