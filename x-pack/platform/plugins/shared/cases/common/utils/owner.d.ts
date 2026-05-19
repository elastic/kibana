import { OWNER_INFO } from '../constants';
import type { ServerlessProjectType, Owner } from '../constants/types';
export declare const isValidOwner: (owner: string | undefined) => owner is keyof typeof OWNER_INFO;
export declare const getCaseOwnerByAppId: (currentAppId?: string) => "cases" | "observability" | "securitySolution" | undefined;
export declare const getOwnerFromRuleConsumerProducer: ({ consumer, producer, serverlessProjectType, }: {
    consumer?: string;
    producer?: string;
    serverlessProjectType?: ServerlessProjectType;
}) => Owner;
