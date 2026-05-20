export declare const connectorsQueriesKeys: {
    jira: readonly ["jira"];
    resilient: readonly ["resilient"];
    servicenow: readonly ["servicenow"];
    jiraGetFieldsByIssueType: (connectorId: string, issueType: string) => readonly ["jira", string, "getFields", string];
    jiraGetIssueTypes: (connectorId: string) => readonly ["jira", string, "getIssueType"];
    jiraGetIssues: (connectorId: string, query: string) => readonly ["jira", string, "getIssues", string];
    jiraGetIssue: (connectorId: string, id: string) => readonly ["jira", string, "getIssue", string];
    resilientGetFields: (connectorId: string) => readonly ["resilient", string, "getFields"];
    servicenowGetChoices: (connectorId: string, fields: string[]) => readonly ["servicenow", string, "getChoices", string[]];
};
