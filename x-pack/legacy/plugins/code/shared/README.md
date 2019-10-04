## Shared Modules

This document includes all the components, APIs, and type definitions of Code that are shared across the stack
with other applications. 

### REST APIs

* **POST /api/code/integration/snippets**

**Example**:

1. Import `https://github.com/elastic/opbeans-python` repository into Code app. Hold on for a while for the indexing to be done.

2. For the following stacktrace item in APM 

![image](https://user-images.githubusercontent.com/987855/66232529-e18ed900-e69d-11e9-8035-225f5c086bcc.png)

You can make a request as below:

```
curl --request POST \
  --url http://localhost:5601/jkb/api/code/integration/snippets \
  --header 'authorization: Basic ZWxhc3RpYzpjaGFuZ2VtZQ==' \
  --header 'content-type: application/json' \
  --header 'kbn-xsrf: reporting' \
  --data '{
	"requests": [
		{
			"repoUris": ["github.com/elastic/opbeans-python"],
			"stacktraceItems": [
				{
					"filePath": "opbeans/views.py",
					"lineNumStart": 191
				}
			]
		}
	]
}'
```

You will expect a result: 

```
[
  [
    {
      "results": [
        {
          "uri": "github.com/elastic/opbeans-python",
          "filePath": "opbeans/views.py",
          "language": "python",
          "hits": 1,
          "compositeContent": {
            "content": "\n        # set transaction name to post_order\n        elasticapm.set_transaction_name('POST opbeans.views.post_order')\n        return post_order(request)\n    order_list = list(m.Order.objects.values(\n        'id', 'customer_id', 'customer__full_name', 'created_at'\n",
            "lineMapping": [
              "..",
              "189",
              "190",
              "191",
              "192",
              "193",
              ".."
            ],
            "ranges": [
              {
                "startColumn": 1,
                "startLineNumber": 4,
                "endColumn": 1,
                "endLineNumber": 4
              }
            ]
          }
        }
      ],
      "fallback": false,
      "took": 0,
      "total": 1
    }
  ]
]
```



### Type definitions

* **StackTraceSnippetsRequest**

