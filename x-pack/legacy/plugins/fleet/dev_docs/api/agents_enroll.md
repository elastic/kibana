# Enroll Fleet agent API

Enroll agent

## Request

`POST /api/fleet/agents/enroll`

## Headers

- `kbn-fleet-enrollment-token` (Required, string) A fleet enrollment token.

## Request body

- `type` (Required, string) Agent type should be one of `EPHEMERAL`, `TEMPORARY`, `PERMANENT`
- `shared_id` (Optional, string) An ID for the agent.
- `metadata` (Optional, object) Objects with `local` and `user_provided` properties that contain the metadata for an agent. The metadata is a dictionary of strings (example: `"local": { "os": "macos" }`).

## Response code

`200` Indicates a successful call.
`400` For an invalid request.
`401` For an invalid kbn-fleet-enrollment-token.

## Example

```js
POST /api/fleet/agents/enroll
{
  "type": "PERMANENT",
  "metadata": {
    "local": { "os": "macos"},
    "userProvided": { "region": "us-east"}
  }
}
```

The API returns the following:

```js
{
  "action": "created",
  "success": true,
  "item": {
    "id": "a4937110-e53e-11e9-934f-47a8e38a522c",
    "active": true,
    "policy_id": "default",
    "type": "PERMANENT",
    "enrolled_at": "2019-10-02T18:01:22.337Z",
    "user_provided_metadata": {},
    "local_metadata": {},
    "actions": [],
    "access_token": "ACCESS_TOKEN"
  }
}
```

## Expected errors

The API will return a response with a `401` status code and an error if the enrollment token is invalid like this:

```js
{
  "statusCode": 401,
  "error": "Unauthorized",
  "message": "Enrollment token is not valid: invalid token"
}
```

The API will return a response with a `400` status code and an error if you enroll an agent with the same `shared_id` than an already active agent:

```js
{
  "statusCode": 400,
  "error": "BadRequest",
  "message": "Impossible to enroll an already active agent"
}
```
