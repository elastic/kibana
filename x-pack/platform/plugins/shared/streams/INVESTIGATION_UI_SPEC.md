Building on top of the investigation spec, I need a visualizer for the investigation workflow as well. The idea is that I see the steps in the workflow rendered as a directed graph and I can hover over the individual nodes to see what went in and out, specifically for the investigation flow. E.g. it should clearly show if a hypothesis was discarded by the review judge, etc. etc.

Also there should be summaries for the hypotheses that are checked (e.g. a title or so), and on hover more is exposed, and if the confidence is low, it's shown in the visualization, stuff like that.

Also, for each of the nodes, the user can leave feedback whether that worked well or didn't work well, and that flows back to memory so the system can finetune based on it next time.

This visualizer just takes in the whole workflow execution data structure (with the inputs and outputs of the various nodes) and renders it nicely. It's embedded in two places
* The sigevent for the initial discovery
* In the agent builder UI (like a chart) when an investigation ran - not sure about how to model this - I want the agent to have the investigation workflow as a tool and it can call it, and then the return value should include the execution id or whatever and then it can call another tool to visualize it and we tell it to always do so or something like that - needs some reasearch.

This spec should be implemented as a stacked PR on top of the PR that implements the basic investigation spec. SO in the end there are two PRs, one with just the workflow wiring, and one oon top that can also do the visualization and actually uses it as a tool call and also in the sigevent ui.
