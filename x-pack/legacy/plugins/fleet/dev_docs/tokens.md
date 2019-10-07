# Fleet tokens

Fleet uses 3 types of tokens:

1. Enrollment tokens - A long lived token with optional rules around assignment of policy when enrolling. It is used to enroll N agents.

2. Access tokens - Generated during enrollment, and hidden from the user. This token is used to communicate with Kibana, and is unique to each agent. This allows a single agent to be revoked without affecting other agents or their data ingestion ability.

3. Output ES Token - This is used by the agent to ship data to ES. At the moment this is one token per unique output cluseter per policy due to the scale needed from ES tokens not currently being supported. Once ES can accept the levels of scale needed, we would like to move to one token per agent.

### FAQ

- Why do we need an access token?

Why can't we just use an ES token? For one, because of current scaling concerns on the part of the ES team. But also because if the token were used to query the data then the token would need to have index read privlages able to read any policy or data source. Using an access token we can authenticate and then use Kibana's permission system to allow access to only what is needed by the requesting agent.

- Can't we work on solving some of these issues and thus make this even easier?

Yes, and we plan to. This is the first phase of how this will work, and we plan to reduce complexity over time. Becuase we have automated most of the complexity, all the user will notice is shorter and shorter tokens.
