import type { FunctionComponent, ReactNode } from 'react';
import type { Observable } from 'rxjs';
import type { UserMenuLink } from '@kbn/security-plugin-types-public';
export interface SecurityNavControlRenderButtonProps {
    isOpen: boolean;
    toggleMenu: () => void;
    avatar: ReactNode;
}
interface SecurityNavControlProps {
    avatarSize?: 's' | 'm' | 'l';
    editProfileUrl: string;
    logoutUrl: string;
    renderButton?: (props: SecurityNavControlRenderButtonProps) => NonNullable<ReactNode>;
    userMenuLinks$: Observable<UserMenuLink[]>;
}
export declare const SecurityNavControl: FunctionComponent<SecurityNavControlProps>;
export {};
