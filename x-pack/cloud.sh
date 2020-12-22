export TEST_BROWSER_HEADLESS=1
export TEST_KIBANA_HOSTNAME=0b49cea24a5243e4a20b231b046fe103.us-central1.gcp.foundit.no
export TEST_KIBANA_PROTOCOL=https
export TEST_KIBANA_PORT=9243
export TEST_KIBANA_USER=elastic
export TEST_KIBANA_PASS=k2RnHy9wPrDIlrOOCxXdAjha

export TEST_ES_HOSTNAME=8ac377326e6d49a3890c53556fcdf200.us-central1.gcp.foundit.no
export TEST_ES_PROTOCOL=https
export TEST_ES_PORT=9243
export TEST_ES_USER=elastic
export TEST_ES_PASS=k2RnHy9wPrDIlrOOCxXdAjha
node ../scripts/functional_test_runner --grep "Monitoring is turned off" --debug --exclude-tag skipCloud
