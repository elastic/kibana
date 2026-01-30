/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
export function generateListEscalationPoliciesWorkflow(stackConnectorId: string): string {
  return `version: '1'
name: 'sources.pagerduty.list_escalation_policies'
description: 'List escalation policies in PagerDuty. Supports pagination with limit and offset, filtering by query, and including related resources. Query format: free-text search string that searches across name and description fields (e.g., "production" or "on-call").'
enabled: true
triggers:
  - type: 'manual'
inputs:
  - name: limit
    type: number
    required: false
  - name: offset
    type: number
    required: false
  - name: query
    type: string
    required: false
    description: 'Free-text search string that searches across name and description fields (e.g., "production" or "on-call")'
  - name: include
    type: string
    required: false
    description: 'Comma-separated list of related resources to include (e.g., "teams,services")'
steps:
  - name: list-escalation-policies
    type: pagerduty-v2.listEscalationPolicies
    connector-id: ${stackConnectorId}
    with:
      limit: \${{inputs.limit}}
      offset: \${{inputs.offset}}
      query: "\${{inputs.query}}"
      include: "\${{inputs.include}}"
`;
}

export function generateGetItemWorkflow(stackConnectorId: string): string {
  return `version: "1"
name: sources.pagerduty.get_item
description: Get a PagerDuty item by ID (schedule, incident, or escalation policy)
enabled: true
triggers:
  - type: manual
inputs:
  properties:
    id:
      type: string
      description: The ID of the item to retrieve
    item_type:
      type: string
      description: 'The type of item to retrieve, one of: schedule, incident, escalation_policy)'
    include:
      type: string
      description: |
         Comma-separated list of related resources to include.  Valid values by type:
            schedule - N/A
            incident - past (get past instances of this incident), related (get related incidents), alerts (triggered by the incident), notes (notes attached to the incident), acknowledgers, assignees, priorities, services, teams, users
            escalation_policy - services, teams, targets
    time_zone:
      type: string
      description: Time zone in which dates in the result will be rendered (IANA time zone database name)
  required:
    - id
    - item_type
  additionalProperties: false
steps:
  - name: if-schedule
    type: if
    condition: "\${{inputs.item_type == 'schedule'}}"
    steps:
      - name: get-schedule
        type: pagerduty-v2.getSchedule
        connector-id: ${stackConnectorId}
        with:
          id: \${{inputs.id}}
          include: \${{inputs.include}}
          timeZone: \${{inputs.time_zone}}
    else:
      - name: if-incident-check
        type: if
        condition: "\${{inputs.item_type == 'incident'}}"
        steps:
          - name: get-incident
            type: pagerduty-v2.getIncident
            if: "\${{inputs.item_type == 'incident'}}"
            connector-id: ${stackConnectorId}
            with:
              id: "\${{inputs.id}}"
              include: "\${{inputs.include}}"
          - name: if-escalation-policy
            type: if
            condition: "\${{ inputs.item_type == 'escalation_policy' }}"
            steps:
              - name: get-escalation-policy
                type: pagerduty-v2.getEscalationPolicy
                if: "\${{inputs.item_type == 'escalation_policy'}}"
                connector-id: ${stackConnectorId}
                with:
                  id: "\${{inputs.id}}"
                  include: "\${{inputs.include}}"
`;
}

export function generateListIncidentsWorkflow(stackConnectorId: string): string {
  return `version: '1'
name: 'sources.pagerduty.list_incidents'
description: 'List incidents in PagerDuty. Supports filtering by status, service, date range, urgency, and pagination. Filter formats: statuses and urgencies are comma-separated strings (e.g., "triggered,acknowledged" or "high,low"); service_ids is comma-separated service IDs; dates use ISO 8601 format (e.g., "2024-01-01T00:00:00Z").'
enabled: true
triggers:
  - type: 'manual'
inputs:
  - name: limit
    type: number
    required: false
  - name: offset
    type: number
    required: false
  - name: statuses
    type: string
    required: false
    description: 'Comma-separated list of statuses (e.g., "triggered,acknowledged,resolved")'
  - name: service_ids
    type: string
    required: false
    description: 'Comma-separated list of service IDs to filter by'
  - name: since
    type: string
    required: false
    description: 'Start of the date range over which you want to search (ISO 8601 format)'
  - name: until
    type: string
    required: false
    description: 'End of the date range over which you want to search (ISO 8601 format)'
  - name: urgencies
    type: string
    required: false
    description: 'Comma-separated list of urgencies (e.g., "high,low")'
  - name: include
    type: string
    required: false
    description: 'Comma-separated list of related resources to include'
steps:
  - name: list-incidents
    type: pagerduty-v2.listIncidents
    connector-id: ${stackConnectorId}
    with:
      limit: \${{inputs.limit}}
      offset: \${{inputs.offset}}
      statuses: "\${{inputs.statuses}}"
      serviceIds: "\${{inputs.service_ids}}"
      since: "\${{inputs.since}}"
      until: "\${{inputs.until}}"
      urgencies: "\${{inputs.urgencies}}"
      include: "\${{inputs.include}}"
`;
}

export function generateListSchedulesWorkflow(stackConnectorId: string): string {
  return `version: '1'
name: 'sources.pagerduty.list_schedules'
description: 'List schedules in PagerDuty. Supports pagination, filtering by query, and including related resources. Query format: free-text search string that searches across name and description fields (e.g., "primary" or "weekend").'
enabled: true
triggers:
  - type: 'manual'
inputs:
  - name: limit
    type: number
    required: false
  - name: offset
    type: number
    required: false
  - name: query
    type: string
    required: false
    description: 'Free-text search string that searches across name and description fields (e.g., "primary" or "weekend")'
  - name: include
    type: string
    required: false
    description: 'Comma-separated list of related resources to include'
  - name: time_zone
    type: string
    required: false
    description: 'Time zone in which dates in the result will be rendered (IANA time zone database name)'
steps:
  - name: list-schedules
    type: pagerduty-v2.listSchedules
    connector-id: ${stackConnectorId}
    with:
      limit: \${{inputs.limit}}
      offset: \${{inputs.offset}}
      query: "\${{inputs.query}}"
      include: "\${{inputs.include}}"
      timeZone: "\${{inputs.time_zone}}"

`;
}

export function generateSearchWorkflow(stackConnectorId: string): string {
  return `version: "1"
name: sources.pagerduty.search
description: List PagerDuty items by type (schedules, escalation_policies) with query. Uses common params limit, offset, total, query, include.
enabled: true
triggers:
  - type: manual
inputs:
  properties:
    item_type:
      type: string
      description: 'The type of items to list, one of: schedules, escalation_policies'
    limit:
      type: number
      description: Maximum number of items to return
    offset:
      type: number
      description: Number of items to skip (pagination)
    total:
      type: boolean
      description: If true, include total count in the response
    query:
      type: string
      description: 'Free-text search across name and description fields'
    include:
      type: string
      description: |
        Comma-separated list of related resources to include.  Valid values by type:
            schedules - N/A (list response includes schedule_layers, users)
            escalation_policies - services, teams, targets
  required:
    - item_type
  additionalProperties: false
steps:
  - name: if-schedules
    type: if
    condition: "\${{inputs.item_type == 'schedules'}}"
    steps:
      - name: list-schedules
        type: pagerduty-v2.listSchedules
        connector-id: ${stackConnectorId}
        with:
          limit: \${{inputs.limit}}
          offset: \${{inputs.offset}}
          total: \${{inputs.total}}
          query: "\${{inputs.query}}"
          include: "\${{inputs.include}}"
    else:
      - name: list-escalation-policies
        type: pagerduty-v2.listEscalationPolicies
        connector-id: ${stackConnectorId}
        with:
          limit: \${{inputs.limit}}
          offset: \${{inputs.offset}}
          total: \${{inputs.total}}
          query: "\${{inputs.query}}"
          include: "\${{inputs.include}}"
`;
}

export function generateListOnCallsWorkflow(stackConnectorId: string): string {
  return `version: '1'
name: 'sources.pagerduty.list_oncalls'
description: 'List current on-call assignments in PagerDuty. Supports filtering by schedule, user, or escalation policy, and time range queries. Use this to find who is currently on call for specific schedules.'
enabled: true
triggers:
  - type: 'manual'
inputs:
  - name: limit
    type: number
    required: false
  - name: offset
    type: number
    required: false
  - name: schedule_ids
    type: string
    required: false
    description: 'Comma-separated list of schedule IDs to filter by (e.g., "P123ABC,P456DEF")'
  - name: user_ids
    type: string
    required: false
    description: 'Comma-separated list of user IDs to filter by'
  - name: escalation_policy_ids
    type: string
    required: false
    description: 'Comma-separated list of escalation policy IDs to filter by'
  - name: since
    type: string
    required: false
    description: 'Start of time range for on-call periods (ISO 8601 format)'
  - name: until
    type: string
    required: false
    description: 'End of time range for on-call periods (ISO 8601 format)'
  - name: include
    type: string
    required: false
    description: 'Comma-separated list of related resources to include'
  - name: time_zone
    type: string
    required: false
    description: 'Time zone in which dates in the result will be rendered (IANA time zone database name)'
steps:
  - name: list-oncalls
    type: pagerduty-v2.listOnCalls
    connector-id: ${stackConnectorId}
    with:
      limit: \${{inputs.limit}}
      offset: \${{inputs.offset}}
      scheduleIds: "\${{inputs.schedule_ids}}"
      userIds: "\${{inputs.user_ids}}"
      escalationPolicyIds: "\${{inputs.escalation_policy_ids}}"
      since: "\${{inputs.since}}"
      until: "\${{inputs.until}}"
      include: "\${{inputs.include}}"
      timeZone: "\${{inputs.time_zone}}"
`;
}
