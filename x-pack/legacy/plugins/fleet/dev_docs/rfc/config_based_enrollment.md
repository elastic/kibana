### Static enrollment

##### The use case:

Agents are deployed using Elasic Cloud sliders, we want them to be a part of fleet. Due to the UX of having "deployed" these using fleet, the current UX might feel wrong/broken because they would need to enroll, meaning Kibana would need to be setup and running already for Cloud to hit the API. Given the current user flows this might not be ideal.
Cloud's existing M.O. is to deploy things and provide information on the things deployed via kibana.yaml

##### Proposal:

In Kibana config we support the following:

```
xpack.fleet.agents:
  agent-id-1: policy-id
  agent-id-2: policy-id
  agent-id-3: policy-id
  agent-id-4: policy-id
  agent-id-5: ~
```

In the above, the first time an agent with the provided ID checks into Fleet, we will return back an extra key in the response containing the access token to be used in subsaquent requests, as if combining enrollment with the initial check in. The agents ID being in the config will replace the need of the enrollment token to enroll said agents.

If an agent tries to enroll one of the provided IDs, but is already enrolled, the checkin api will return a 403 error.

##### Open questions:

- How will the policy be created staticly? Or should this type of deployment only support rules?
- This feels much more like the migration of an existing agent into fleet, so should we support this as it's user flow?
  - Cloud could deploy staticly a local agent.yml and then Fleet could migrate it in.
  - Cloud could define the policy in the Kibana.yml if EPM adds support for this.
