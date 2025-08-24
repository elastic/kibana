yq '(.paths.*.* | .description | select(length > 0)) |= (. // "") + "<br /><br />[Learn](#topic-kibana-spaces) how to select a space for this request."' ./oas_docs/output/kibana.yaml \
 | yq '(.paths.*.* | .description | select(length == 0)) |= (. // "") + "[Learn](#topic-kibana-spaces) how to select a space for this request."' \
 | > temp.yaml