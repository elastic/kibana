import type { CasesConfigurationUI } from '../types';
export declare const initialConfiguration: CasesConfigurationUI;
export declare const getConfigurationByOwner: ({ configurations, owner, }: {
    configurations: CasesConfigurationUI[] | null;
    owner: string | undefined;
}) => CasesConfigurationUI;
