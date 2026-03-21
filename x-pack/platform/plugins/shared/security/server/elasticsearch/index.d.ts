import type { AuthenticatedUser } from '../../common';
export type AuthenticationInfo = Omit<AuthenticatedUser, 'authentication_provider' | 'elastic_cloud_user'>;
export type { ElasticsearchServiceStart, OnlineStatusRetryScheduler, } from './elasticsearch_service';
export { ElasticsearchService } from './elasticsearch_service';
