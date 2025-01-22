/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
export const EX_ANSWER_PROGRAM = `(
    !has(state.cursor) || !has(state.cursor.scroll_id) ?
            post(state.url+"?scroll=5m", "", "")
        :
            post(
                state.url+"/scroll?"+{"scroll_id": [state.cursor.scroll_id]}.format_query(),
                "application/json",
                {"scroll": state.scroll}.encode_json()
            )
    ).as(resp, bytes(resp.Body).decode_json().as(body, {
            "events": body.hits.hits,
            "cursor": {"scroll_id": body._scroll_id},
}))`;

export const EX_ANSWER_STATE = `["config1", "config2"]`;

export const EX_ANSWER_CONFIG = [
  {
    name: 'config1',
    default: 50,
    redact: false,
  },
  {
    name: 'config2',
    default: '',
    redact: false,
  },
  {
    name: 'config3',
    default: 'event',
    redact: true,
  },
];

export const SAMPLE_CEL_PROGRAMS = [
  `request("GET", (state.url+"&startingAfter="+state.cursor.checkpoint)).with({
      "Header":{
          "Content-Type": ["application/json"],
          "Authorization": [state.token],
      },
    }).do_request().as(resp, resp.StatusCode == 200 ?
      bytes(resp.Body).decode_json().as(body,{
        "events": body.map(e, { "message": e.encode_json(), }),
        "cursor": {
          "initial_checkpoint": state.cursor.initial_checkpoint,
          "checkpoint": body.size() > 0 ? body[body.size()-1].?serial : state.cursor.initial_checkpoint,
        },
        "want_more": body.size() != 0,
        "token": state.token,
      })
    :
      {
        "events": {
          "error": {
            "code": string(resp.StatusCode),
            "id": string(resp.Status),
            "message": "GET:"+(
              size(resp.Body) != 0 ?
                string(resp.Body)
              :
                string(resp.Status) + ' (' + string(resp.StatusCode) + ')'
            ),
          },
        },
        "want_more": false,
      }
    )`,
  `request("GET", state.url).with({
      "Header":{
        "Content-Type": ["application/json"],
      }
    }).as(req, req.do_request().as(resp, 
      bytes(resp.Body).decode_json().as(body, {
        "events": body.payloads.map(payload, {
          "message": payload.encode_json()
        }),
        "url": state.url
      })
    ))`,
  `(
    !state.want_more ?
      request("GET", state.url + "/iocs/combined/indicator/v1?sort=modified_on&offset=0&limit=" + string(state.batch_size) + '&filter=modified_on:>"' + (
        has(state.cursor) && has(state.cursor.last_timestamp) && state.cursor.last_timestamp != null ?
          state.cursor.last_timestamp + '"'
        :
          (now - duration(state.initial_interval)).format(time_layout.RFC3339) + '"'
      ))
    :
      request("GET", state.url + "/iocs/combined/indicator/v1?sort=modified_on&limit=" + string(state.batch_size) + "&offset=" + string(state.offset) + '&filter=modified_on:>"' + (
        has(state.cursor) && has(state.cursor.first_timestamp) && state.cursor.first_timestamp != null ?
          state.cursor.first_timestamp + '"'
        :
          '"'
      ))
  ).do_request().as(resp,
    resp.StatusCode == 200 ?
      bytes(resp.Body).decode_json().as(body, {
        "events": body.resources.map(e, {
          "message": e.encode_json(),
        }),
        "want_more": has(body.meta.pagination) && (int(state.offset) + body.resources.size()) < body.meta.pagination.total,
        "offset": has(body.meta.pagination) && ((int(state.offset) + body.resources.size()) < body.meta.pagination.total) ?
          int(state.offset) + int(body.resources.size())
        :
          0,
        "url": state.url,
        "batch_size": state.batch_size,
        "initial_interval": state.initial_interval,
        "cursor": {
          "last_timestamp": (
            has(body.resources) && body.resources.size() > 0 ?
              (
                has(state.cursor) && has(state.cursor.last_timestamp) && body.resources.map(e, e.modified_on).max() < state.cursor.last_timestamp ?
                  state.cursor.last_timestamp
                :
                  body.resources.map(e, e.modified_on).max()
              )
            :
              (
                has(state.cursor) && has(state.cursor.last_timestamp) ?
                  state.cursor.last_timestamp
                :
                  null
              )
          ),
          "first_timestamp": (
            has(state.cursor) && has(state.cursor.first_timestamp) && state.cursor.first_timestamp != null ?
              (
                state.want_more ?
                  state.cursor.first_timestamp
                :
                  state.cursor.last_timestamp
              )
            :
              (now - duration(state.initial_interval)).format(time_layout.RFC3339)
          ),
        },
      })
    :
      {
        "events": {
          "error": {
            "code": string(resp.StatusCode),
            "id": string(resp.Status),
            "message": "GET:"+(
              size(resp.Body) != 0 ?
                string(resp.Body)
              :
                string(resp.Status) + ' (' + string(resp.StatusCode) + ')'
            ),
          },
        },
        "want_more": false,
        "offset": 0,
        "url": state.url,
        "batch_size": state.batch_size,
        "initial_interval": state.initial_interval,
      }
  )
    `,
  `
    state.with({
  "Header": {
    "Accept": ["application/vnd.api+json"],
    "Authorization": ["Token " + state.api_token],
  }
}.as(auth_header,
  (
    has(state.work_list) ?
      state.work_list
    : (state.audit_id == "*" && state.end_point_type == "/rest/orgs/") ?
      get_request(
        state.url.trim_right("/") + "/rest/orgs?" + {
          "version": [state.version],
        }.format_query()
      ).with(auth_header).do_request().as(resp, resp.StatusCode != 200 ? [] :
        resp.Body.decode_json().data.map(org, {
          "id":            org.id,
          ?"last_created": state.?cursor[org.id].last_created
        })
      )
    : has(state.?cursor.last_created) ?
      [{
        "id":           state.audit_id,
        "last_created": state.cursor.last_created,
      }]
    : has(state.cursor) && state.end_point_type == "/rest/orgs/" ?
      state.cursor.map(audit_id, state.cursor[audit_id].with({"id": audit_id}))
    :
      [{"id": state.audit_id}]
  ).map(item,
    get_request(
      debug("GET", state.url.trim_right("/") + item.?next.orValue(
        state.end_point_type + item.id + "/audit_logs/search?" + debug("QUERY",{
          "version":     [state.version],
          "sort_order":  ['ASC'],
          ?"from":       has(item.last_created) ?
                           optional.of([string(timestamp(item.last_created)+duration("1us"))])
                         : has(state.lookback) ? 
                           optional.of([string(now-duration(state.lookback))])
                         :
                           optional.none(),
          ?"size":       has(state.size) ?
                           optional.of([string(int(state.size))])
                         :
                           optional.none(),
          ?"user_id":    has(state.user_id) ?
                           optional.of([state.user_id])
                         :
                           optional.none(),
          ?"project_id": has(state.project_id) ?
                           optional.of([state.project_id])
                         :
                           optional.none(),
          ?"events":     state.?events_filter,
        }).format_query()
      ))
    ).with(auth_header).do_request().as(resp, resp.StatusCode != 200 ?
      {
        "id": item.id,
        "events": {
          "error": {
            "code": string(resp.StatusCode),
            "id": string(resp.Status),
            "message": "GET:"+(
              size(resp.Body) != 0 ?
                string(resp.Body)
              :
                string(resp.Status) + ' (' + string(resp.StatusCode) + ')'
            ),
        },
        "want_more": false,
      }
    :
      bytes(resp.Body).decode_json().as(body, !has(body.?data.items) ?
        {
          "id": item.id,
          "events":[],
          "want_more": false,
        }
      :
        {
          "id": item.id,
          "events": body.data.items.map(item, {
            "message": item.encode_json()
          }),
          "cursor": {
            "id": item.id,
            ?"next": body.?links.next,
            "last_created": body.data.items.map(item,
              has(item.created), timestamp(item.created)
            ).as(times, size(times) == 0 ? item.?last_created.orValue(now) : times.max()),
          },
          "want_more": has(body.?links.next),
        }
      )
    )
  ).as(result, {
    "cursor": state.?cursor.orValue({}).drop("last_created").with(zip(
      result.map(r, has(r.?cursor.id), r.cursor.id), 
      result.map(r, has(r.?cursor.id), r.cursor.drop(["id","next"]))
    )),
    "work_list": result.map(r, has(r.?cursor.next), {
      "id": r.cursor.id,
      "next": r.cursor.next,
    }),
    "events": result.map(r, r.events).flatten(),
    "want_more": result.exists(r, r.want_more),
  })
))`,
  `(
      has(state.hostlist) && size(state.hostlist) > 0 ?
          state
        : 
          state.with(request("GET", state.url + "/api/atlas/v2/groups/" + state.group_id + "/processes?pageNum=" + string(state.page_num) + "&itemsPerPage=state.page_size").with({
            "Header": {
              "Accept": ["application/vnd.atlas." + string(now.getFullYear()) + "-01-01+json"]
            }
          }).do_request().as(resp, bytes(resp.Body).decode_json().as(body, {
            "hostlist": body.results.map(e, state.url + "/api/atlas/v2/groups/" + state.group_id + "/processes/" + e.id + state.query),
            "next": 0,
            "page_num": body.links.exists_one(res, res.rel == "next") ? int(state.page_num)+1 : 1
          })))
      ).as(state, state.next >= size(state.hostlist) ? {} :
        request("GET", string(state.hostlist[state.next])).with({
          "Header": {
            "Accept": ["application/vnd.atlas." + string(now.getFullYear()) + "-01-01+json"]
          }
        }).do_request().as(res, {
          "events": bytes(res.Body).decode_json().as(f, f.with({"response": zip(
            //Combining measurement names and actual values of measurement to generate \`key : value\` pairs.
            f.measurements.map(m, m.name),
            f.measurements.map(m, m.dataPoints.map(d, d.value).as(v, size(v) == 0 ? null : v[0]))
          )}).drop(["measurements", "links"])),
          "hostlist": (int(state.next)+1) < size(state.hostlist) ? state.hostlist : [],
          "next": (int(state.next)+1) < size(state.hostlist) ? (int(state.next)+1) : 0,
          "want_more": (int(state.next)+1) < size(state.hostlist) || state.page_num != 1,
          "page_num": state.page_num,
          "group_id": state.group_id,
          "query": state.query,
        })
      )`,
];

export const SAMPLE_CEL_PROGRAMS_OAUTH = [
  `state.with(
    post(state.url.trim_right("/") + "/oauth/token", "application/json", {
      "client_id": state.client_id,
      "client_secret": state.client_secret,
      "audience": state.url.trim_right("/") + "/api/v2/",
      "grant_type": "client_credentials",
    }.encode_json()).as(auth_resp, auth_resp.StatusCode != 200 ?
      {
        "events": {
          "error": {
            "code": string(auth_resp.StatusCode),
            "id": string(auth_resp.Status),
            "message": "POST:"+(
              size(auth_resp.Body) != 0 ?
                string(auth_resp.Body)
              :
                string(auth_resp.Status) + ' (' + string(auth_resp.StatusCode) + ')'
            ),
          },
        },
        "want_more": false,
      }
    :
      {
        "Body": bytes(auth_resp.Body).decode_json(),
      }
    ).as(token, has(token.events) ? token :
      get_request(
        state.?next.orValue(
          has(state.?cursor.next) ?
            // Use the cursor next rel link if it exists.
            state.cursor.next.parse_url().as(next, next.with({
              // The next rel link includes the take parameter which the
              // user may have changed, so replace it with the config's
              // value.
              "RawQuery": next.RawQuery.parse_query().with({
                ?"take": has(state.take) ?
                  optional.of([string(state.take)])
                :
                  optional.none(),
              }).format_query()
            }).format_url())
          :
            // Otherwise construct a next rel-ish link to look back.
            state.url.trim_right("/") + "/api/v2/logs?" + {
              ?"take": has(state.take) ?
                optional.of([string(state.take)])
              :
                optional.none(),
              ?"from": has(state.look_back) ?
                // Format a relative timestamp into a log ID.
                optional.of(["900" + (now-duration(state.look_back)).format("20060102150405") + "000000000000000000000000000000000000000"])
              :
                optional.none(),
            }.format_query()
        )
      ).with({
        "Header": {
          "Authorization": [token.?Body.token_type.orValue("Bearer") + " " + token.?Body.access_token.orValue("MISSING")],
          "Accept": ["application/json"],
        }
      }).do_request().as(resp, resp.StatusCode != 200 ?
        {
          "events": {
            "error": {
              "code": string(resp.StatusCode),
              "id": string(resp.Status),
              "message": "GET:"+(
                size(resp.Body) != 0 ?
                  string(resp.Body)
                :
                  string(resp.Status) + ' (' + string(resp.StatusCode) + ')'
              ),
            },
          },
          "want_more": false,
        }
      :
        {
          "Body": bytes(resp.Body).decode_json(),
          ?"next": resp.Header.?Link[0].orValue("").as(next, next.split(";").as(attrs, attrs.exists(attr, attr.contains('rel="next"')) ?
            attrs.map(attr, attr.matches("^<https?://"), attr.trim_prefix('<').trim_suffix('>'))[?0]
          :
            optional.none()
          )),
        }.as(result, result.with({
          "events": result.Body.map(e, {"json": {"log_id": e.log_id, "data": e}}),
          "cursor": {
            ?"next": result.?next,
          },
          "want_more": has(result.next) && size(result.Body) != 0,
        })).drop("Body")
      )
    )
  )`,
  `request("POST", state.url.trim_right("/") + "/auth/external").with(
  			{
  				"Header": {
  					"Accept": ["application/json"],
  					"Content-Type": ["application/json"],
  				},
  				"Body": {
  					"clientId": state.auth_client_id,
  					"accessKey": state.auth_access_key,
  				}.encode_json(),
  			}
  		).do_request().as(resp,
  			(resp.StatusCode == 200) ?
  				bytes(resp.Body).decode_json().as(body,
  					body.data.token
  				)
  			:
  				bytes(resp.Body).decode_json().as(body,
  					body.message
  				)
  		).as(auth_token,
  			// submit logs query to search security event logs
  			request("POST", state.url.trim_right("/") + "/app/laas-logs-api/api/logs_query").with(
  				{
  					"Header": {
  						"Accept": ["application/json"],
  						"Content-Type": ["application/json"],
  						"Authorization": ["Bearer " + auth_token],
  					},
  					"Body": {
  						"filter": state.filter,
  						"limit": state.limit,
  						"pageLimit": state.page_limit,
  						"cloudService": "Harmony Endpoint",
  						"timeframe": {
  							"startTime": (state.?cursor.next_startTime.orValue(null) == null) ?
  								timestamp(now() - duration(state.initial_interval)).format(time_layout.RFC3339)
  							:
  								timestamp(state.cursor.next_startTime).format(time_layout.RFC3339),
  							"endTime": timestamp(now().format(time_layout.RFC3339)),
  						},
  					}.encode_json(),
  				}
  			).do_request().as(resp,
  				(resp.StatusCode == 200) ?
  					bytes(resp.Body).decode_json().as(body,
  						state.with(
  							{
  								"events": [{ "message": { "event": { "reason": "polling" }}.encode_json() }],
  								"want_more": true,
  								"cursor": {
  									"auth_token": auth_token,
  									"task_id": body.data.taskId,
  									"task_ready": false,
  									"page_token": null,
  									"next_startTime": (has(state.cursor) && has(state.cursor.next_startTime)) ? state.cursor.next_startTime : null,
  									"last_page": false,
  								},
  							}
  						)
  					)
  				:
  					state.with(
  						{
  							"events": {
  								"error": {
  									"message": "Error " + bytes(resp.Body).decode_json().as(body, body.message),
  								},
  							},
  							"want_more": false,
  							"cursor": state.cursor.with(
  								{
  									"auth_token": null,
  									"task_id": null,
  									"task_ready": false,
  									"page_token": null,
  									"last_page": false,
  								}
  							),
  						}
  					)
  			)
  		)`,
];
