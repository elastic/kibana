# Fleet tokens

Fleet uses 3 types of API Keys:

1. Enrollment Token - A long lived token with optional rules around assignment of policy when enrolling. It is used to enroll N agents.

2. Access Token - Generated during enrollment and hidden from the user. This token is used to communicate with Kibana and is unique to each agent. This allows a single agent to be revoked without affecting other agents or their data ingestion ability.

3. Output API Keys - This is used by the agent to ship data to ES. This token is unique per agent.

### FAQ

- Can't we work on solving some of these issues and thus make this even easier?

Yes, and we plan to. This is the first phase of how this will work, and we plan to reduce complexity over time. Because we have automated most of the complexity, all the user will notice is shorter and shorter tokens.
