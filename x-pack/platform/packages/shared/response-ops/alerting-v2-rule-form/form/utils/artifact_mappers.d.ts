export type RuleArtifactPayload = Array<{
    id: string;
    type: string;
    value: string;
}>;
export interface RuleArtifactSlices {
    artifacts?: RuleArtifactPayload;
    runbookArtifacts?: RuleArtifactPayload;
    dashboardArtifacts?: RuleArtifactPayload;
}
export declare const mapArtifacts: (artifacts: RuleArtifactPayload | undefined) => RuleArtifactPayload | undefined;
export declare const splitArtifactsByType: (artifacts: RuleArtifactPayload | undefined) => RuleArtifactSlices;
export declare const mergeArtifactsByType: ({ artifacts, runbookArtifacts, dashboardArtifacts, }: RuleArtifactSlices) => RuleArtifactPayload | undefined;
