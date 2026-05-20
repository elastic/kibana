export interface UserActions {
    action: string;
    action_field: string[];
    action_at: string;
    action_by: {
        email: string;
        username: string;
        full_name: string;
    };
    new_value: string | null;
    old_value: string | null;
    owner: string;
}
export interface UserActionVersion800 {
    action?: string;
    action_field?: string[];
    new_value?: string | null;
    old_value?: string | null;
}
