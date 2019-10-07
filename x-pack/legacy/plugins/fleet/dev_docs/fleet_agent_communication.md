# Fleet <> Agent communication protocal

1. Makes request to the [`agent/enroll` endpoint](/docs/api/fleet.asciidoc) using the [enrollment token](tokens.md) as a barrier token, the policy ID being enrolled to, and the type of the agent.

2. Fleet verifies the Enrollment token is valid. And returns back a unique [auth token](tokens.md).

This Auth token is created to work only for the assigned policy.
The auth token is assigned to the combination of agent and policy, and the policy can be swapped out dynamicly without creating a new auth token.

3. The agent now "checks in" with Fleet.

The agent uses the auth token to post its current event queue to [`agent/checkin`](/docs/api/fleet.asciidoc). The endpoint will return the agents assigned policy, and an array of actions for the agent or its software to run.
The agent continues posting events and recving updated policy chnages every 30 sec or via polling settings in the policy.

4. The agent takes the returned pollicy and array of actions and first reloads any policy changes. It then runs any/all actions starting at index 0.

### If an agent / host is compromised

1. The user via the UI or API invalidates an agents auth token in Fleet by "unenrolling" an agent.

2. At the time of the agents next checkin, auth will fail resulting in a 403 error.

3. The agent will stop polling and delete the localy cached policy.

4. It is **/strongly/** recommended that if an agent is compermized, the outputs used on the given agent delete their ES access tokens, and regenerate them.

To re-enable the agent, it must be re-enrolled. Permanent and temprary agents maintain state in Fleet, if one is re-enrolled a new auth token is generatred and the agent is able to resume as it was. If this is not desired, the agent will be listed in a disabled state (`active: false`), and from the detials screen it can be deleted.

### If an enrollment token is compromised

Fleet only supports a single active enrollment token at a time. If one becomes compromised, it is canceled and regenerated.
The singular enrollment token helps to reduce complexity, and also helps to reenforce to users that this token is an "admin" token in that it has a great deal of power, thus should be kept secret/safe.
