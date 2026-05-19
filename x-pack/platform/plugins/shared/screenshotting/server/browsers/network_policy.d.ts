interface NetworkPolicyRule {
    allow: boolean;
    protocol?: string;
    host?: string;
}
export interface NetworkPolicy {
    enabled: boolean;
    rules: NetworkPolicyRule[];
}
export declare function allowRequest(url: string, rules: NetworkPolicyRule[]): boolean;
export {};
