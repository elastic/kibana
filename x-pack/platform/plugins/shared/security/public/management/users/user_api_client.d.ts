import type { HttpStart } from '@kbn/core/public';
import type { EditUser, User } from '../../../common';
export declare class UserAPIClient {
    private readonly http;
    constructor(http: HttpStart);
    getUsers(): Promise<User[]>;
    getUser(username: string): Promise<User>;
    deleteUser(username: string): Promise<void>;
    saveUser(user: EditUser): Promise<void>;
    changePassword(username: string, password: string, currentPassword?: string): Promise<void>;
    disableUser(username: string): Promise<void>;
    enableUser(username: string): Promise<void>;
}
