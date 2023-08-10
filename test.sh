#!/bin/bash

while :
do
    response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5601/api/status)
    node -e 'console.log(new Date())' 
    echo $response
done