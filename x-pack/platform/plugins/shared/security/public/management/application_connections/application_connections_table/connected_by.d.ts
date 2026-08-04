import React from 'react';
import type { OAuthConnectionUser } from '../service/application_connections_api_client';
export interface ConnectedByOptions {
    userId?: string;
    user?: OAuthConnectionUser;
}
export declare const getConnectedByDisplayName: ({ userId, user, }: ConnectedByOptions) => string | undefined;
export interface ConnectedByProps extends ConnectedByOptions {
    ['data-test-subj']?: string;
}
export declare const ConnectedBy: ({ userId, user, "data-test-subj": dataTestSubj }: ConnectedByProps) => React.JSX.Element;
