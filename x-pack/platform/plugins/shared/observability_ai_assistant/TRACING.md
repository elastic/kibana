### Tracing

For investigating LLM requests and responses, you can use Langtrace, [an open-source Observability tool for LLMs](https://langtrace.ai/). It's based on OTel. It allows us to easily see what requests are being sent to the LLM and what responses are received.

Here's how to set up locally:

- checkout out [the Langtrace repository](https://github.com/Scale3-Labs/langtrace) locally
- run `docker-compose up` (for further instructions, check the repository)
- go to http://localhost:3000 (or where you've configured Langtrace to run)
- create a project, and generate an API key
- run Kibana with the following command: `$ LANGTRACE_API_KEY=<my-api-key> LANGTRACE_API_HOST=<langtrace-host> npm start

If you use the AI Assistant, you should then start seeing traces and metrics in the project you've configured.
