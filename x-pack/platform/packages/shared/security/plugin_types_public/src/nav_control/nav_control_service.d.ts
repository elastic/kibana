import type { IconType } from '@elastic/eui';
import type { MouseEvent, ReactNode } from 'react';
import type { Observable } from 'rxjs';
export interface UserMenuLink {
    label: string;
    iconType: IconType;
    href: string;
    order?: number;
    setAsProfile?: boolean;
    onClick?: (event: MouseEvent<Element>) => void;
    /** Render a custom ReactNode instead of the default <EuiContextMenuItem /> */
    content?: ReactNode | ((args: {
        closePopover: () => void;
    }) => ReactNode);
}
export interface SecurityNavControlServiceStart {
    /**
     * Returns an Observable of the array of user menu links (the links that show up under the user's Avatar in the UI) registered by other plugins
     */
    getUserMenuLinks$: () => Observable<UserMenuLink[]>;
    /**
     * Registers the provided user menu links to be displayed in the user menu (the links that show up under the user's Avatar in the UI).
     */
    addUserMenuLinks: (newUserMenuLink: UserMenuLink[]) => void;
}
