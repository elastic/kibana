# alert

this mapping is for the alerting rule saved object

```
{
  enabled: boolean;
  /** the name of the rule */
  name: string;
  tags: string;
  alertTypeId: string;
  schedule: {
    interval: string;
  };
  consumer: string;
  legacyId: string;
  actions: {
    group: string;
    actionRef: string;
    actionTypeId: string;
    params: {};
  };
  /** alert params, not available as a structured type */
  params: object;
  mapped_params: {
    risk_score: number;
    severity: string;
  };
  scheduledTaskId: string;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
  apiKey: string;
  apiKeyOwner: string;
  throttle: string;
  notifyWhen: string;
  muteAll: boolean;
  mutedInstanceIds: string;
  meta: {
    versionApiKeyLastmodified: string;
  };
  monitoring: {
    execution: {
      history: {
        duration: number;
        success: boolean;
        timestamp: string;
      };
      calculated_metrics: {
        p50: number;
        p95: number;
        p99: number;
        success_ratio: number;
      };
    };
  };
  executionStatus: {
    numberOfTriggeredActions: number;
    status: string;
    lastExecutionDate: string;
    lastDuration: number;
    error: {
      reason: string;
      message: string;
    };
    warning: {
      reason: string;
      message: string;
    };
  };
  snoozeEndTime: string;
}
```
