import React, { Component } from 'react';
import type { ApplicationStart, NotificationsStart, ScopedHistory } from '@kbn/core/public';
import type { PublicMethodsOf } from '@kbn/utility-types';
import type { Role, User } from '../../../../common';
import type { RolesAPIClient } from '../../roles';
import type { UserAPIClient } from '../user_api_client';
interface Props {
    userAPIClient: PublicMethodsOf<UserAPIClient>;
    rolesAPIClient: PublicMethodsOf<RolesAPIClient>;
    notifications: NotificationsStart;
    history: ScopedHistory;
    navigateToApp: ApplicationStart['navigateToApp'];
    readOnly?: boolean;
}
interface State {
    users: User[];
    visibleUsers: User[];
    roles: null | Role[];
    selection: User[];
    showDeleteConfirmation: boolean;
    permissionDenied: boolean;
    filter: string;
    includeReservedUsers: boolean;
    isTableLoading: boolean;
    pageIndex: number;
    pageSize: number;
}
export declare class UsersGridPage extends Component<Props, State> {
    static defaultProps: Partial<Props>;
    private static readonly PAGE_SIZE_OPTIONS;
    private static readonly DEFAULT_PAGE_SIZE;
    constructor(props: Props);
    componentDidMount(): void;
    render(): React.JSX.Element;
    private handleDelete;
    private getVisibleUsers;
    private loadUsersAndRoles;
    private renderToolsLeft;
    private onIncludeReservedUsersChange;
    private renderToolsRight;
    private getUserStatusBadges;
    private updateUrlParams;
    private onTableChange;
    private onCancelDelete;
}
export {};
