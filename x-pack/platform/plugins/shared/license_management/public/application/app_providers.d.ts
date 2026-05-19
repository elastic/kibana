import React from 'react';
import type { AppDependencies } from './app_context';
interface Props {
    appDependencies: AppDependencies;
    children: React.ReactNode;
}
export declare const AppProviders: ({ appDependencies, children }: Props) => React.JSX.Element;
export {};
