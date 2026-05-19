import type { FunctionComponent } from 'react';
import type { Observable } from 'rxjs';
import type { UserMenuLink } from '@kbn/security-plugin-types-public';
interface SecurityNavControlProps {
    editProfileUrl: string;
    logoutUrl: string;
    userMenuLinks$: Observable<UserMenuLink[]>;
}
export declare const SecurityNavControl: FunctionComponent<SecurityNavControlProps>;
export {};
