import type { User } from './user';
export interface ExternalServicePersisted {
    connector_name: string;
    external_id: string;
    external_title: string;
    external_url: string;
    pushed_at: string;
    pushed_by: User;
}
